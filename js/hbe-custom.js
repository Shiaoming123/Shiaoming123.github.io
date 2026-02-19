/**
 * hexo-blog-encrypt 自定义增强脚本
 * 添加扁平风格的验证按钮和交互优化
 */

(function() {
  'use strict';

  // 等待页面和加密容器加载
  function initCustomEncrypt() {
    // 检查是否存在加密容器
    const encryptContainer = document.getElementById('hexo-blog-encrypt');
    if (!encryptContainer) {
      // 如果容器还没加载，等待一下再试
      setTimeout(initCustomEncrypt, 100);
      return;
    }

    // 查找密码输入框
    const passwordInput = document.getElementById('hbePass');
    if (!passwordInput) {
      console.log('未找到密码输入框');
      return;
    }

    // 检查是否已经添加过按钮
    if (document.querySelector('.hbe-custom-button')) {
      console.log('按钮已存在，跳过添加');
      return;
    }

    console.log('开始自定义加密界面...');

    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'hbe-button-container';
    buttonContainer.style.cssText = 'margin-top: 15px;';

    // 创建验证按钮
    const verifyButton = document.createElement('button');
    verifyButton.type = 'button';
    verifyButton.className = 'hbe-custom-button hbe-button';
    verifyButton.textContent = '验证密码';
    verifyButton.id = 'hbeVerifyButton';

    // 将按钮添加到容器
    buttonContainer.appendChild(verifyButton);

    // 找到输入框的父容器，插入按钮
    const inputParent = passwordInput.closest('.hbe-input') || passwordInput.parentNode;
    if (inputParent) {
      inputParent.appendChild(buttonContainer);
    }

    // 创建消息容器
    const messageContainer = document.createElement('div');
    messageContainer.id = 'hbeMessageContainer';
    messageContainer.className = 'hbe-message-container';
    messageContainer.style.cssText = 'margin-top: 15px; text-align: center; min-height: 20px;';
    if (inputParent) {
      inputParent.appendChild(messageContainer);
    }

    // 保存原始的加密函数
    const originalHbeScript = document.getElementById('hbeData');
    if (!originalHbeScript) {
      console.error('未找到加密数据');
      return;
    }

    // 验证函数
    function verifyPassword() {
      const password = passwordInput.value.trim();

      // 检查密码是否为空
      if (!password) {
        showMessage('请输入密码', 'error');
        passwordInput.focus();
        return;
      }

      console.log('开始验证密码...');

      // 显示加载状态
      verifyButton.classList.add('loading');
      verifyButton.disabled = true;
      verifyButton.textContent = '验证中...';
      showMessage('正在验证...', 'loading');

      // 调用 hexo-blog-encrypt 的解密函数
      if (window.hbe) {
        try {
          // 获取加密数据
          const encryptedData = originalHbeScript.textContent;
          const hmacDigest = originalHbeScript.getAttribute('data-hmacdigest');

          // 调用解密函数
          window.hbe.decrypt(encryptedData, password, hmacDigest)
            .then(function(result) {
              console.log('解密成功');
              showMessage('密码正确，正在加载...', 'success');
              verifyButton.textContent = '验证成功！';

              // 显示解密后的内容
              const contentDiv = document.querySelector('.hbe-content');
              if (contentDiv) {
                contentDiv.style.display = 'block';
                contentDiv.innerHTML = result;
              }

              // 隐藏输入界面
              setTimeout(function() {
                encryptContainer.style.display = 'none';
              }, 500);
            })
            .catch(function(error) {
              console.error('解密失败:', error);
              showMessage('密码错误，请重试', 'error');

              // 恢复按钮状态
              verifyButton.classList.remove('loading');
              verifyButton.disabled = false;
              verifyButton.textContent = '验证密码';
              passwordInput.value = '';
              passwordInput.focus();

              // 添加抖动动画
              passwordInput.style.animation = 'shake 0.5s';
              setTimeout(function() {
                passwordInput.style.animation = '';
              }, 500);
            });
        } catch (e) {
          console.error('解密出错:', e);
          showMessage('解密出错，请重试', 'error');
          verifyButton.classList.remove('loading');
          verifyButton.disabled = false;
          verifyButton.textContent = '验证密码';
        }
      } else {
        // 如果 hbe 对象不存在，使用原始方式（触发回车事件）
        console.log('使用回车事件方式');
        const enterEvent = new KeyboardEvent('keypress', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        passwordInput.dispatchEvent(enterEvent);

        // 恢复按钮状态
        setTimeout(function() {
          verifyButton.classList.remove('loading');
          verifyButton.disabled = false;
          verifyButton.textContent = '验证密码';
        }, 1000);
      }
    }

    // 显示消息函数
    function showMessage(text, type) {
      if (!messageContainer) return;

      messageContainer.textContent = text;
      messageContainer.className = 'hbe-message-container hbe-' + type + '-message';

      // 添加样式
      if (type === 'error') {
        messageContainer.style.cssText = 'margin-top: 15px; text-align: center; min-height: 20px; color: #dc3545; font-size: 14px;';
      } else if (type === 'success') {
        messageContainer.style.cssText = 'margin-top: 15px; text-align: center; min-height: 20px; color: #28a745; font-size: 14px;';
      } else if (type === 'loading') {
        messageContainer.style.cssText = 'margin-top: 15px; text-align: center; min-height: 20px; color: #6c757d; font-size: 14px;';
      }

      // 自动隐藏消息
      if (type !== 'loading') {
        setTimeout(function() {
          messageContainer.textContent = '';
        }, 3000);
      }
    }

    // 按钮点击事件
    verifyButton.addEventListener('click', function(e) {
      e.preventDefault();
      verifyPassword();
    });

    // 回车键事件
    passwordInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        verifyPassword();
      }
    });

    // 页面加载时自动聚焦密码输入框
    setTimeout(function() {
      passwordInput.focus();
    }, 100);

    console.log('自定义加密界面初始化完成');
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomEncrypt);
  } else {
    initCustomEncrypt();
  }

  // 添加抖动动画样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }

    /* 自定义按钮基础样式 */
    .hbe-custom-button {
      width: 100%;
      padding: 14px 24px;
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      -webkit-tap-highlight-color: transparent;
    }

    .hbe-custom-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    }

    .hbe-custom-button:active {
      transform: translateY(0);
      box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
    }

    .hbe-custom-button.loading {
      opacity: 0.7;
      cursor: not-allowed;
      pointer-events: none;
    }

    .hbe-custom-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* 移动端优化 */
    @media (max-width: 768px) {
      .hbe-custom-button {
        padding: 16px 24px;
        font-size: 16px;
        /* 移动端最小触摸目标 44px */
        min-height: 44px;
      }

      /* 移动端按压效果 */
      .hbe-custom-button:active {
        transform: scale(0.98);
      }
    }

    /* 触摸设备优化 */
    @media (hover: none) and (pointer: coarse) {
      .hbe-custom-button {
        /* 移除悬停效果 */
        transform: none !important;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      }

      .hbe-custom-button:active {
        transform: scale(0.98) !important;
      }
    }
  `;
  document.head.appendChild(style);

})();
