import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Textarea,
  useToast,
  FormControl,
  FormLabel,
  Text,
  VStack,
  Box,
  Icon
} from '@chakra-ui/react';
import { FiMessageSquare, FiSend } from 'react-icons/fi';

interface UserFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: number | string;
}

const UserFeedbackModal: React.FC<UserFeedbackModalProps> = ({ isOpen, onClose, userId }) => {
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  // 提交反馈
  const handleSubmit = async () => {
    if (!feedbackContent.trim()) {
      toast({
        title: '请输入反馈内容',
        status: 'warning',
        duration: 2000,
        isClosable: true
      });
      return;
    }

    // 移除字符限制检查，允许任意长度的反馈
    // if (feedbackContent.trim().length < 10) {
    //   toast({
    //     title: '反馈内容至少需要10个字符',
    //     status: 'warning',
    //     duration: 2000,
    //     isClosable: true,
    //   });
    //   return;
    // }

    setIsSubmitting(true);

    try {
      // 获取用户ID（优先从admin-user，然后从多个位置尝试）
      let currentUserId = userId;

      if (!currentUserId) {
        // 1. 尝试从 admin-user 中获取（管理员登录）
        const adminUserStr = localStorage.getItem('admin-user');
        if (adminUserStr) {
          try {
            const adminUser = JSON.parse(adminUserStr);
            currentUserId = adminUser.userId || adminUser.id;
            console.log('✓ 从admin-user获取到userId:', currentUserId);
          } catch (e) {
            console.log('解析admin-user失败:', e);
          }
        }
      }

      // 2. 尝试从localStorage的其他位置获取
      if (!currentUserId) {
        const userIdFromStorage =
          localStorage.getItem('userId') ||
          localStorage.getItem('user_id') ||
          localStorage.getItem('fastgpt_user_id');
        if (userIdFromStorage) {
          currentUserId = parseInt(userIdFromStorage);
          console.log('✓ 从localStorage获取到userId:', currentUserId);
        }
      }

      // 3. 尝试从Cookie获取
      if (!currentUserId) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'userId' || name === 'user_id') {
            currentUserId = parseInt(value);
            if (!isNaN(currentUserId)) {
              console.log('✓ 从Cookie获取到userId:', currentUserId);
              break;
            }
          }
        }
      }

      // 4. 尝试从token解析（格式：jwt_token_123，其中123是userId）
      if (!currentUserId) {
        const token =
          localStorage.getItem('admin-token') ||
          localStorage.getItem('user-token') ||
          localStorage.getItem('fastgpt-auth-token') ||
          localStorage.getItem('token');
        if (token) {
          // token格式：jwt_token_123，提取后面的数字
          const match = token.match(/jwt_token_(\d+)/);
          if (match && match[1]) {
            currentUserId = parseInt(match[1]);
            console.log('✓ 从token解析到userId:', currentUserId);
          } else {
            // 尝试JWT格式解析
            try {
              const parts = token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                currentUserId = payload.userId || payload.id || payload.sub;
                if (currentUserId) {
                  console.log('✓ 从JWT token解析到userId:', currentUserId);
                }
              }
            } catch (e) {
              console.log('Token既不是jwt_token格式也不是JWT格式');
            }
          }
        }
      }

      console.log('📝 最终使用的userId:', currentUserId);

      // 确定API URL
      const apiUrl =
        window.location.hostname === 'localhost'
          ? 'http://localhost:8080/api/feedbacks/create'
          : 'http://10.14.53.120:8080/api/feedbacks/create';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUserId || null,
          context: feedbackContent.trim()
        })
      });

      const result = await response.json();

      if (result.code === 200) {
        toast({
          title: '反馈提交成功',
          description: '感谢您的反馈，我们会认真处理！',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
        setFeedbackContent('');
        onClose();
      } else {
        toast({
          title: '提交失败',
          description: result.message || '请稍后重试',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('提交反馈失败:', error);
      toast({
        title: '网络错误',
        description: '请检查网络连接后重试',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent mx={4}>
        <ModalHeader>
          <Box display="flex" alignItems="center" gap={2}>
            <Icon as={FiMessageSquare} color="blue.500" boxSize={5} />
            <Text>信息反馈</Text>
          </Box>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.500">
              <Text fontSize="sm" color="gray.700">
                💡 您的反馈对我们很重要！请告诉我们您在使用过程中遇到的问题、建议或意见。
              </Text>
            </Box>

            <FormControl isRequired>
              <FormLabel>反馈内容</FormLabel>
              <Textarea
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                placeholder="请详细描述您的问题、建议或意见（至少10个字符）&#10;例如：&#10;- 遇到的具体问题&#10;- 功能改进建议&#10;- 使用体验反馈"
                rows={8}
                resize="vertical"
                focusBorderColor="blue.400"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                已输入 {feedbackContent.length} 个字符
              </Text>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isSubmitting}>
            取消
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="提交中..."
            leftIcon={<Icon as={FiSend} />}
          >
            提交反馈
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default UserFeedbackModal;
