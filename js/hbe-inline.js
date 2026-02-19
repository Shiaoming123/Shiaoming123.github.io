/*
 * hexo-blog-encrypt 自定义增强脚本（内联版本）
 * 直接添加到加密文章中
 */

(function() {
  'use strict';

  console.log('加载自定义加密脚本...');

  // 等待加密容器加载
  function waitForEncrypt() {
    const encryptContainer = document.getElementById('hexo-blog-encrypt');
    const passwordInput = document.getElementById('hbePass');

    if (!encryptContainer || !passwordInput) {
      console.log('等待加密容器加载...');
      setTimeout(waitForEncrypt, 100);
      return;
    }

    console.log('加密容器已加载，初始化按钮...');

    // 检查是否已经添加过按钮
    if (document.getElementById('hbeVerifyButton')) {
      console.log('按钮已存在');
      return;
    }

    // 创建验证按钮
    const verifyButton = document.createElement('button');
    verifyButton.type = 'button';
    verifyButton.id = 'hbeVerifyButton';
    verifyButton.className = 'hbe-button';
    verifyButton.textContent = '🔓 验证密码';
    verifyButton.style.cssText = `
      display: block;
      width: 100%;
      padding: 16px 24px;
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 20px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
      -webkit-tap-highlight-color: transparent;
      min-height: 48px;
    `;

    // 添加悬停效果
    verifyButton.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
    });

    verifyButton.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    });

    // 按下效果
    verifyButton.addEventListener('mousedown', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 2px 10px rgba(102, 126, 234, 0.4)';
    });

    // 找到输入框的父容器并插入按钮
    const inputParent = passwordInput.parentNode;
    if (inputParent) {
      inputParent.appendChild(verifyButton);
      console.log('验证按钮已添加');
    }

    // 按钮点击事件
    verifyButton.addEventListener('click', function(e) {
      e.preventDefault();
      const password = passwordInput.value.trim();

      if (!password) {
        alert('请输入密码');
        passwordInput.focus();
        return;
      }

      console.log('验证密码：', password);

      // 显示加载状态
      verifyButton.textContent = '⏳ 验证中...';
      verifyButton.style.opacity = '0.7';
      verifyButton.disabled = true;

      // 触发回车事件（插件会处理）
      const enterEvent = new KeyboardEvent('keypress', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      });
      passwordInput.dispatchEvent(enterEvent);

      // 2秒后恢复按钮状态
      setTimeout(function() {
        verifyButton.textContent = '🔓 验证密码';
        verifyButton.style.opacity = '1';
        verifyButton.disabled = false;
      }, 2000);
    });

    // 回车键事件
    passwordInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        verifyButton.click();
      }
    });

    // 页面加载时自动聚焦
    setTimeout(function() {
      passwordInput.focus();
    }, 200);

    console.log('自定义加密脚本初始化完成');
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForEncrypt);
  } else {
    waitForEncrypt();
  }
})();
