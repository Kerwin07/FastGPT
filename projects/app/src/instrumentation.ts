import { exit } from 'process';

// 全局错误处理 - 防止进程崩溃
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (error: Error) => {
    console.error('');
    console.error('='.repeat(80));
    console.error('[UNCAUGHT EXCEPTION] 捕获到未处理的异常，但进程将继续运行');
    console.error('时间:', new Date().toISOString());
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('='.repeat(80));
    console.error('');
    // 不调用 exit()，让进程继续运行
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('');
    console.error('='.repeat(80));
    console.error('[UNHANDLED REJECTION] 捕获到未处理的Promise拒绝，但进程将继续运行');
    console.error('时间:', new Date().toISOString());
    console.error('原因:', reason);
    if (reason instanceof Error) {
      console.error('错误堆栈:', reason.stack);
    }
    console.error('='.repeat(80));
    console.error('');
    // 不调用 exit()，让进程继续运行
  });
}

/*
  Init system
*/
export async function register() {
  try {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      // 基础系统初始化
      const [
        { connectMongo },
        { connectionMongo, connectionLogMongo, MONGO_URL, MONGO_LOG_URL },
        { systemStartCb },
        { initGlobalVariables, getInitConfig, initSystemPluginGroups, initAppTemplateTypes },
        { initVectorStore },
        { initRootUser },
        { getSystemPluginCb },
        { startMongoWatch },
        { startCron },
        { startTrainingQueue },
        { preLoadWorker },
        { loadSystemModels }
      ] = await Promise.all([
        import('@fastgpt/service/common/mongo/init'),
        import('@fastgpt/service/common/mongo/index'),
        import('@fastgpt/service/common/system/tools'),
        import('@/service/common/system'),
        import('@fastgpt/service/common/vectorDB/controller'),
        import('@/service/mongo'),
        import('@/service/core/app/plugin'),
        import('@/service/common/system/volumnMongoWatch'),
        import('@/service/common/system/cron'),
        import('@/service/core/dataset/training/utils'),
        import('@fastgpt/service/worker/preload'),
        import('@fastgpt/service/core/ai/config/utils')
      ]);

      // 执行初始化流程
      systemStartCb();
      initGlobalVariables();

      // Connect to MongoDB
      await connectMongo({ db: connectionMongo, url: MONGO_URL });
      await connectMongo({ db: connectionLogMongo, url: MONGO_LOG_URL });

      //init system config；init vector database；init root user
      await Promise.all([getInitConfig(), initVectorStore(), initRootUser(), loadSystemModels()]);

      // 异步加载
      initSystemPluginGroups();
      initAppTemplateTypes();
      getSystemPluginCb();
      startMongoWatch();
      startCron();
      startTrainingQueue(true);

      try {
        await preLoadWorker();
      } catch (error) {
        console.error('Preload worker error', error);
      }

      console.log('Init system success');
    }
  } catch (error) {
    console.log('Init system error', error);
    exit(1);
  }
}
