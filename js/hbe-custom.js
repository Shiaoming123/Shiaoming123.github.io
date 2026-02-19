/**
 * hexo-blog-encrypt 自定义增强脚本
 * 添加扁平风格的验证按钮和交互优化
 */

(function() {
  'use strict';

  // 等待页面加载完成
  document.addEventListener('DOMContentLoaded', function() {
    // 检查是否存在加密容器
    const encryptContainer = document.getElementById('hexo-blog-encrypt');
    if (!encryptContainer) return;

    // 查找密码输入框
    const passwordInput = document.getElementById('hbePass');
    if (!passwordInput) return;

    // 创建验证按钮
    const verifyButton = document.createElement('button');
    verifyButton.type = 'button';
    verifyButton.className = 'hbe-button';
    verifyButton.textContent = '验证密码';

    // 插入按钮到输入框后面
    passwordInput.parentNode.insertBefore(verifyButton, passwordInput.nextSibling);

    // 添加消息容器
    const messageContainer = document.createElement('div');
    messageContainer.id = 'hbe-message';
    messageContainer.className = 'hbe-message-container';
    passwordInput.parentNode.appendChild(messageContainer);

    // 验证函数
    function verifyPassword() {
      const password = passwordInput.value;

      // 检查密码是否为空
      if (!password) {
        showMessage('请输入密码', 'error');
        passwordInput.focus();
        return;
      }

      // 显示加载状态
      verifyButton.classList.add('loading');
      verifyButton.textContent = '验证中...';
      showMessage('正在验证密码...', 'loading');

      // 触发 hexo-blog-encrypt 的解密函数
      // 插件会自动处理解密逻辑
      try {
        // 模拟点击输入框的回车事件（插件监听此事件）
        const enterEvent = new KeyboardEvent('keypress', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        passwordInput.dispatchEvent(enterEvent);

        // 恢复按钮状态（如果解密失败）
        setTimeout(function() {
          if (verifyButton.classList.contains('loading')) {
            verifyButton.classList.remove('loading');
            verifyButton.textContent = '验证密码';
          }
        }, 2000);
      } catch (error) {
        console.error('解密出错:', error);
        showMessage('解密出错，请重试', 'error');
        verifyButton.classList.remove('loading');
        verifyButton.textContent = '验证密码';
      }
    }

    // 显示消息函数
    function showMessage(text, type) {
      messageContainer.textContent = text;
      messageContainer.className = 'hbe-message-container hbe-' + type + '-message';

      // 自动隐藏成功和加载消息
      if (type === 'loading') {
        // 不隐藏加载消息
      } else if (type === 'success') {
        setTimeout(function() {
          messageContainer.textContent = '';
        }, 3000);
      } else if (type === 'error') {
        // 3秒后隐藏错误消息
        setTimeout(function() {
          messageContainer.textContent = '';
        }, 3000);
      }
    }

    // 按钮点击事件
    verifyButton.addEventListener('click', verifyPassword);

    // 回车键事件
    passwordInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        verifyPassword();
      }
    });

    // 页面加载时自动聚焦密码输入框
    passwordInput.focus();

    // 监听解密成功事件（插件可能触发）
    document.addEventListener('hbeDecryptSuccess', function() {
      showMessage('密码正确，正在加载内容...', 'success');
      verifyButton.classList.remove('loading');
      verifyButton.textContent = '验证成功！';

      // 隐藏整个加密界面
      setTimeout(function() {
        encryptContainer.style.display = 'none';
      }, 500);
    });

    // 监听解密失败事件
    document.addEventListener('hbeDecryptFailed', function() {
      showMessage('密码错误，请重试', 'error');
      verifyButton.classList.remove('loading');
      verifyButton.textContent = '验证密码';
      passwordInput.value = '';
      passwordInput.focus();

      // 添加抖动动画
      passwordInput.style.animation = 'shake 0.5s';
      setTimeout(function() {
        passwordInput.style.animation = '';
      }, 500);
    });
  });

  // 添加抖动动画样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
  `;
  document.head.appendChild(style);

})();
