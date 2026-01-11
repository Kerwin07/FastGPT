# FastGPT 知识库强关联问题解决方案

## 问题描述

在 FastGPT 中添加知识库后，AI 只会在知识库中检索答案，而不会使用自己的通用知识回答问题。这导致：
- 对于不在知识库中的问题，AI 不回答或回答不准确
- 知识库成为唯一的信息源，限制了 AI 的能力
- 无法平衡知识库检索和通用 AI 对话

## 原因分析

FastGPT 的工作流设计中，知识库检索节点**没有条件分支**输出（isEmpty/unEmpty），导致无论检索结果如何，都会将结果传递给 AI Chat 节点。这造成了强关联。

### 核心代码位置

1. **数据集检索模板** (`packages/global/core/workflow/template/system/datasetSearch.ts` 138-156行)
   - 只有一个输出：`datasetQuoteQA`（知识库引用）
   - **缺少**条件输出：`isEmpty`（无结果）和 `unEmpty`（有结果）

2. **输出过滤逻辑** (`projects/app/src/web/core/workflow/adapt.ts` 420-428行)
   ```typescript
   if (output.key === 'isEmpty') return;
   if (output.key === 'unEmpty') return;
   ```
   - 代码明确过滤掉了 isEmpty/unEmpty 输出
   - 这说明系统支持条件分支，但知识库检索节点未启用

## 解决方案

### 方案 1：优化 AI 提示词（**最简单有效，强烈推荐！**）

**核心思想**：让 AI 明白它可以在知识库为空或不相关时，使用自己的通用知识回答。

**操作步骤：**

1. **打开应用工作流编辑页面**
   - 进入你的 FastGPT 应用
   - 点击"高级编排"进入工作流编辑器

2. **找到 AI Chat 节点（对话节点）**
   - 在工作流画布中找到"AI 对话"节点
   - 点击节点展开配置

3. **修改系统提示词（System Prompt）**

   **❌ 错误的提示词**（导致强关联）：
   ```
   你是一个知识库助手，根据提供的知识库内容回答用户问题。
   请严格基于知识库内容回答，不要自己编造。
   ```
   👆 这会让 AI 认为必须依赖知识库，没有内容就不敢回答！

   **✅ 正确的提示词**（平衡使用）：
   ```
   你是一个智能助手，结合知识库和你的通用知识回答用户问题。

   ## 回答策略：
   1. 如果知识库有相关内容：优先使用知识库回答，并标注引用来源
   2. 如果知识库内容不足或不相关：直接使用你的通用知识回答
   3. 可以结合两者：用知识库作为基础，补充你的理解和扩展

   ## 注意事项：
   - 不要因为知识库为空就拒绝回答
   - 对于通用问题、闲聊等，自然地使用你的知识
   - 回答要准确、友好、有帮助
   ```

   **🎯 更灵活的提示词**（推荐用于专业领域知识库）：
   ```
   你是[领域]专家助手，可以访问专业知识库和你的通用知识。

   ## 知识库使用原则：
   - 当问题涉及[具体领域内容]时：优先参考知识库，确保准确性
   - 当问题是通用知识、概念解释、闲聊等：直接用你的知识回答
   - 当知识库内容不完整时：用你的知识补充和扩展

   ## 回答风格：
   - 知识库有内容时：标注来源 [引用文档名]
   - 使用自身知识时：自然回答，无需说明来源
   - 结合使用时：清晰区分哪些来自知识库，哪些是补充说明

   保持专业、准确、友好。
   ```

4. **保存并测试**
   - 保存工作流
   - 测试各种问题，观察 AI 是否能灵活使用知识库和自身知识

**效果对比：**

| 问题类型 | 旧提示词 | 新提示词 |
|---------|---------|---------|
| 知识库内问题 | ✅ 正常回答 | ✅ 正常回答（带引用） |
| 通用知识问题 | ❌ 拒绝回答 / 答非所问 | ✅ 使用 AI 通用知识 |
| 闲聊 | ❌ 尴尬或生硬 | ✅ 自然对话 |
| 部分相关问题 | ⚠️ 强行关联知识库 | ✅ 知识库 + AI 知识结合 |

---

### 方案 2：调整相似度阈值（辅助优化）

在优化提示词的基础上，配合调整相似度阈值效果更好：

**操作步骤：**

1. **找到知识库检索节点**
   - 在工作流画布中找到"知识库搜索"节点

2. **调整相似度参数**
   - "最低相关度"（similarity）：`0.5-0.6`（避免太多不相关内容）
   - "最大 Tokens"：`3000-5000`

**参数推荐：**

| 场景 | similarity | 说明 |
|-----|-----------|------|
| 专业领域（精确匹配） | 0.6-0.7 | 只召回高度相关内容 |
| 通用知识库（平衡） | 0.5 | 平衡召回和准确性 |
| 广泛知识库（宽松） | 0.4 | 召回更多内容供 AI 筛选 |

### 方案 3：使用 IF/ELSE 条件节点（高级方案，通常不需要）

**工作流结构：**

```
用户输入
    ↓
知识库检索
    ↓
IF/ELSE 条件判断
    ├─ 如果：知识库引用为空 → AI Chat（无知识库）
    └─ 否则：有引用 → AI Chat（带知识库）
```

**操作步骤：**

1. **添加 IF/ELSE 条件节点**
   - 在知识库检索节点后添加"条件分支"节点
   - 连接：知识库检索 → IF/ELSE

2. **配置条件**
   - 变量：选择知识库检索的 `引用内容` 输出
   - 条件：选择 `为空` (isEmpty)
   - 这会判断知识库是否有匹配结果

3. **添加两个 AI Chat 节点**
   
   **节点 A（IF 分支 - 无知识库）：**
   - 连接：IF/ELSE 的"IF"输出 → AI Chat A
   - 系统提示词：
     ```
     你是一个智能助手，直接使用你的知识回答用户问题。
     保持友好、准确、有帮助。
     ```
   - **不连接**知识库引用输入

   **节点 B（ELSE 分支 - 有知识库）：**
   - 连接：IF/ELSE 的"ELSE"输出 → AI Chat B
   - 连接：知识库检索的"引用内容" → AI Chat B 的"引用内容"输入
   - 系统提示词：
     ```
     你是一个知识库助手，优先使用提供的知识库内容回答用户问题。
     如果知识库内容不够完整，可以补充你的通用知识。
     回答时请引用来源。
     ```

4. **保存并测试**
   - 测试知识库内的问题（应该走 ELSE 分支，使用知识库）
   - 测试知识库外的问题（应该走 IF 分支，使用通用知识）

### 方案 4：启用问题优化功能（进阶优化）

**操作步骤：**

1. **配置知识库检索节点**
   - 找到"问题优化"配置项
   - 启用"使用问题优化"（datasetSearchUsingExtensionQuery）
   - 选择模型：`gpt-4o-mini` 或类似模型

2. **配置优化背景**
   - 在"问题优化背景描述"中输入：
     ```
     你需要将用户的问题转化为更适合知识库检索的查询。
     如果问题明显不在知识库范围内（如闲聊、通用问题），
     返回一个空查询以跳过检索。
     ```

3. **工作原理**
   - AI 会先判断问题是否适合检索知识库
   - 不相关的问题会生成空查询，触发空结果
   - 相关问题会优化查询词，提高检索准确率

### 方案 5：配置空结果响应（需要检查版本支持）

根据代码搜索发现的 `responseEmptyText` 参数（在 `SearchParamsTip.tsx` 中），部分版本可能支持：

1. **检查你的 FastGPT 版本**
   - 查看知识库检索节点配置
   - 是否有"空结果响应"（Empty result response）选项

2. **如果支持，配置为**：
   ```
   抱歉，我在知识库中没有找到相关信息。让我用我的通用知识来回答你的问题...
   ```

3. **效果**：
   - 知识库无结果时，AI 会收到这个提示
   - 可以引导 AI 使用通用知识回答

## 推荐配置（综合方案）

### 🏆 最佳实践：方案 1（优化提示词）

**只需修改 AI Chat 节点的系统提示词！**

```
你是一个智能助手，擅长结合专业知识和通用知识回答问题。

## 回答原则：
1. 有知识库内容时：优先使用，标注来源
2. 知识库为空或不相关时：大胆使用你的通用知识
3. 可以混合使用：知识库 + 你的理解和扩展

不要因为知识库为空就拒绝回答！你本身就是一个强大的 AI 助手。
```

**为什么这样就够了？**
- ✅ LLM 本身有强大的通用知识（GPT-4, Claude 等）
- ✅ 知识库只是**参考资料**，不是唯一信息源
- ✅ AI 可以根据引用内容是否为空，自动判断是否使用
- ✅ 提示词给了 AI "许可"，它就会灵活使用两种知识

---

### 🎯 进阶优化：方案 1 + 方案 2

如果基础方案还不够理想，再配合调整：

1. **优化提示词**（必须）：如上文

2. **调整相似度阈值**（可选）：
   - similarity: `0.5-0.6`
   - 避免召回太多不相关内容混淆 AI

3. **知识库范围说明**（提示词中添加）：
   ```
   ## 知识库范围：
   本知识库包含[具体领域/主题]的专业内容。
   
   对于知识库范围内的问题：请参考知识库内容
   对于知识库范围外的问题：直接使用你的通用知识
   ```

## 技术细节

### 知识库检索返回空结果的情况

在 `packages/service/core/workflow/dispatch/dataset/search.ts` 中：

```typescript
const emptyResult = {
  quoteQA: [],  // 空引用数组
  nodeResponse: {
    totalPoints: 0,
    query: '',
    limit,
    searchMode
  },
  nodeDispatchUsages: [],
  toolResponses: []
};

// 以下情况返回空结果：
if (!userChatInput) {
  return emptyResult;  // 无用户输入
}

if (datasetIds.length === 0) {
  return emptyResult;  // 无数据集
}
```

### 相似度过滤逻辑

在 `packages/service/core/dataset/search/controller.ts` (803-832行)：

```typescript
// 使用相似度过滤的条件
const usingSimilarityFilter = 
  usingReRank ||  // 启用了重排
  searchMode === DatasetSearchModeEnum.embedding;  // 向量检索模式

// 过滤低于阈值的结果
if (usingSimilarityFilter) {
  searchRes = searchRes.filter(item => item.score >= similarity);
}
```

**关键点：**
- `similarity = 0.4` 默认值意味着 40% 相似就接受
- 提高到 0.6-0.7 可以显著减少误召回
- embedding 模式会应用相似度过滤
- mixedRecall 模式混合了全文和向量，过滤逻辑更复杂

## 验证方案

**测试用例：**

1. **知识库内问题**（应该使用知识库）
   - 示例：如果你的知识库是"信号处理"，问"什么是傅里叶变换？"
   - 预期：使用知识库内容回答，带引用

2. **知识库外通用问题**（应该使用通用知识）
   - 示例："今天天气怎么样？"
   - 预期：使用 AI 通用知识回答，不强行关联知识库

3. **边界问题**（部分相关）
   - 示例："信号处理在人工智能中的应用"
   - 预期：如果知识库有相关内容就使用，否则用通用知识补充

4. **闲聊**（完全无关）
   - 示例："你好，最近怎么样？"
   - 预期：正常闲聊，不提及知识库

## 常见问题

### Q1: 为什么知识库检索节点没有 isEmpty/unEmpty 输出？

A: 这是 FastGPT 当前版本的设计决策。检索节点只返回引用数组（可能为空数组），需要通过 IF/ELSE 节点手动判断是否为空。

### Q2: 调高相似度阈值会不会漏掉相关内容？

A: 会有这个风险。建议：
- 先从 0.6 开始测试
- 观察是否有应该召回但没召回的情况
- 如果漏召回，降低到 0.55
- 如果误召回（不相关内容），提高到 0.65-0.7

### Q3: 如何查看当前检索的相似度分数？

A: 在 FastGPT 中：
1. 进入"知识库" → 你的知识库
2. 点击"搜索测试"标签页
3. 输入测试问题
4. 查看返回结果中的 `score` 字段
5. 根据实际 score 分布调整阈值

### Q4: searchMode 选哪个？

A: 
- **embedding**（向量检索）：语义相关，适合理解题意
- **fullTextRecall**（全文检索）：关键词匹配，适合专业术语
- **mixedRecall**（混合检索）：结合两者，召回更多但可能引入噪音

**推荐：embedding + 较高相似度阈值（0.65）**

## 代码修改（高级用户）

如果你想从源码层面解决，可以修改以下文件启用 isEmpty 输出：

### 1. 启用 isEmpty/unEmpty 输出

**文件**：`packages/global/core/workflow/template/system/datasetSearch.ts`

在 `outputs` 数组中添加：

```typescript
outputs: [
  {
    id: NodeOutputKeyEnum.datasetQuoteQA,
    key: NodeOutputKeyEnum.datasetQuoteQA,
    label: i18nT('common:core.module.Dataset quote.label'),
    description: i18nT('workflow:special_array_format'),
    type: FlowNodeOutputTypeEnum.static,
    valueType: WorkflowIOValueTypeEnum.datasetQuote,
    valueDesc: datasetQuoteValueDesc
  },
  // 添加以下两个输出
  {
    id: 'isEmpty',
    key: 'isEmpty',
    label: '无匹配结果',
    type: FlowNodeOutputTypeEnum.source,
    valueType: WorkflowIOValueTypeEnum.boolean
  },
  {
    id: 'unEmpty',
    key: 'unEmpty',
    label: '有匹配结果',
    type: FlowNodeOutputTypeEnum.source,
    valueType: WorkflowIOValueTypeEnum.boolean
  }
]
```

### 2. 移除输出过滤

**文件**：`projects/app/src/web/core/workflow/adapt.ts` (420-428行)

注释掉或删除：

```typescript
// if (output.key === 'isEmpty') return;  // 删除这行
// if (output.key === 'unEmpty') return;  // 删除这行
```

### 3. 添加分支逻辑

**文件**：`packages/service/core/workflow/dispatch/dataset/search.ts`

在返回结果中添加：

```typescript
return {
  quoteQA: searchRes,
  [DispatchNodeResponseKeyEnum.nodeResponse]: responseData,
  nodeDispatchUsages,
  [DispatchNodeResponseKeyEnum.toolResponses]: toolResponses,
### 🎯 核心答案：是的，你说得对！

**模型本身就有知识库（预训练知识）**，问题在于**提示词没有给 AI "许可"使用它的通用知识**。

### ✅ 最简单的解决方案（90% 情况适用）

**只需修改 AI Chat 节点的系统提示词：**

```
你是智能助手，可以使用知识库和你自己的知识回答问题。

有知识库内容时：优先参考
知识库为空或不相关时：直接用你的知识回答

不要因为知识库没内容就拒绝回答！
```

**为什么这样就行？**
- LLM 收到知识库引用时，会看到是空数组 `[]` 或不相关内容
- 新提示词告诉它"可以用自己的知识"
- AI 就会自然地在两种知识间切换

### 📊 问题根源对比

| 配置 | 旧方案 | 新方案 |
|-----|-------|-------|
| 提示词 | "严格基于知识库回答" | "结合知识库和你的知识" |
| AI 行为 | 知识库为空→拒绝回答 | 知识库为空→用通用知识 |
| 用户体验 | ❌ 答非所问 / 拒绝回答 | ✅ 灵活自然 |

### 🔧 可选的辅助优化

如果提示词优化后还不够理想：
1. 调整相似度阈值（0.5-0.6），避免召回太多不相关内容
2. 在提示词中说明知识库范围，帮助 AI 判断何时用哪种知识

**99% 的情况下，优化提示词就足够了！
4. 测试所有相关功能

## 总结

**快速解决方案（无需改代码）：**
1. 提高相似度阈值到 0.6-0.7
2. 启用问题优化功能
3. 优化 AI Chat 系统提示词

**完整解决方案（需要工作流调整）：**
1. 使用 IF/ELSE 节点判断引用是否为空
2. 配置两个不同的 AI Chat 分支
3. 结合相似度和问题优化

**建议先从快速方案开始测试，如果效果不理想再使用完整方案。**

## 相关文档

- FastGPT 工作流文档：`/docs/guide/dashboard/workflow/`
- 知识库检索配置：`/docs/guide/dashboard/workflow/knowledge_base_search/`
- 条件分支使用：`/docs/guide/dashboard/workflow/tfswitch/`

---

**文档版本**：1.0  
**最后更新**：2025-01-XX  
**适用版本**：FastGPT v4.8+
