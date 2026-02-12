/**
 * 阅读进度追踪模块
 * 使用 localStorage 存储本地进度，支持 GitHub Gist 跨设备同步
 */

class ReadingProgressTracker {
  constructor() {
    this.storageKey = 'blog_reading_progress';
    this.syncKey = 'blog_reading_sync_config';
    this.currentPostPath = this.getCurrentPostPath();
    this.gistId = null; // 用户需要配置自己的 Gist ID
    this.gistToken = null; // 用户需要配置 GitHub Token
    this.syncInterval = 30000; // 30 秒同步一次
    this.lastSyncTime = null;
  }

  /**
   * 初始化阅读进度追踪
   */
  init() {
    // 加载进度
    this.loadProgress();

    // 绑定滚动事件
    this.bindScrollEvent();

    // 检查是否配置了同步
    this.checkSyncConfig();

    // 如果配置了同步，启动定时同步
    if (this.isSyncEnabled()) {
      this.startAutoSync();
    }

    // 在页面上添加进度显示
    this.addProgressBar();
    this.addContinueReadingCard();

    console.log('Reading progress tracker initialized');
  }

  /**
   * 获取当前文章路径
   */
  getCurrentPostPath() {
    const path = window.location.pathname;
    // 移除末尾的 /
    return path.endsWith('/') ? path.slice(0, -1) : path;
  }

  /**
   * 绑定滚动事件
   */
  bindScrollEvent() {
    let scrollTimeout;
    const throttledSave = () => {
      this.saveProgress();
    };

    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(throttledSave, 1000);
    });

    // 页面卸载时保存
    window.addEventListener('beforeunload', () => {
      this.saveProgress();
    });
  }

  /**
   * 保存当前阅读进度
   */
  saveProgress() {
    if (!this.currentPostPath) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    const scrollPercent = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
    const isCompleted = scrollPercent > 90;

    // 读取时长估算（简单实现）
    const existingData = this.getStoredData();
    const lastRead = existingData[this.currentPostPath] || {};
    const readingStartTime = lastRead.lastRead ? new Date(lastRead.lastRead) : new Date();
    const readingTimeSeconds = Math.round((new Date() - readingStartTime) / 1000);

    const progressData = {
      scroll_percent: scrollPercent,
      scroll_top: scrollTop,
      last_read: new Date().toISOString(),
      is_completed: isCompleted,
      reading_time_seconds: (lastRead.reading_time_seconds || 0) + readingTimeSeconds
    };

    // 更新本地存储
    const allData = this.getStoredData();
    allData[this.currentPostPath] = progressData;
    localStorage.setItem(this.storageKey, JSON.stringify(allData));

    // 更新进度条
    this.updateProgressBar(scrollPercent);

    console.log('Progress saved:', scrollPercent + '%');
  }

  /**
   * 获取存储的数据
   */
  getStoredData() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    } catch (error) {
      console.error('Failed to read progress data:', error);
      return {};
    }
  }

  /**
   * 加载进度
   */
  loadProgress() {
    const data = this.getStoredData();
    const currentData = data[this.currentPostPath];

    if (currentData) {
      // 恢复滚动位置
      if (currentData.scroll_top && !currentData.is_completed) {
        setTimeout(() => {
          window.scrollTo({
            top: currentData.scroll_top,
            behavior: 'smooth'
          });
        }, 500);
      }

      // 更新进度条
      if (currentData.scroll_percent) {
        this.updateProgressBar(currentData.scroll_percent);
      }
    }
  }

  /**
   * 添加顶部进度条
   */
  addProgressBar() {
    // 检查是否已存在
    if (document.querySelector('.reading-progress-bar')) return;

    const progressBar = document.createElement('div');
    progressBar.className = 'reading-progress-bar';
    progressBar.innerHTML = `
      <div class="reading-progress-fill"></div>
      <div class="reading-progress-tooltip"></div>
    `;
    document.body.appendChild(progressBar);

    // 添加样式
    this.injectProgressBarStyles();
  }

  /**
   * 注入进度条样式
   */
  injectProgressBarStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .reading-progress-bar {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: rgba(0, 0, 0, 0.1);
        z-index: 9999;
        pointer-events: none;
      }

      .reading-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #49b1f5, #00c4b6);
        width: 0%;
        transition: width 0.3s ease;
      }

      .reading-progress-tooltip {
        position: absolute;
        top: -30px;
        right: 10px;
        background: #333;
        color: #fff;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        opacity: 0;
        transition: opacity 0.3s;
      }

      .reading-progress-bar:hover .reading-progress-tooltip {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 更新进度条
   */
  updateProgressBar(percent) {
    const fill = document.querySelector('.reading-progress-fill');
    if (fill) {
      fill.style.width = percent + '%';
    }
  }

  /**
   * 添加"继续阅读"卡片
   */
  addContinueReadingCard() {
    // 只在文章页面添加
    if (!this.isPostPage()) return;

    const aside = document.querySelector('.aside') || document.querySelector('.sidebar');
    if (!aside) return;

    const unreadArticles = this.getUnreadArticles();

    if (unreadArticles.length === 0) return;

    const cardHTML = `
      <div class="continue-reading-card">
        <h3>📖 继续阅读</h3>
        <div class="unread-list">
          ${unreadArticles.slice(0, 5).map(article => `
            <div class="unread-item" data-path="${article.path}">
              <a href="${article.path}" class="unread-title">${article.title}</a>
              <div class="unread-meta">
                <span class="unread-percent">${article.scroll_percent || 0}%</span>
                <span class="unread-time">${this.formatTimeAgo(article.last_read)}</span>
              </div>
            </div>
          `).join('')}
        </div>
        ${unreadArticles.length > 5 ? `
          <div class="view-all">
            <small>还有 ${unreadArticles.length - 5} 篇未完成</small>
          </div>
        ` : ''}
      </div>
    `;

    aside.insertAdjacentHTML('afterbegin', cardHTML);

    // 添加样式
    this.injectContinueReadingStyles();
  }

  /**
   * 判断是否是文章页面
   */
  isPostPage() {
    const path = window.location.pathname;
    return path.startsWith('/posts/') || path.includes('/posts/');
  }

  /**
   * 获取未完成的文章
   */
  getUnreadArticles() {
    const data = this.getStoredData();
    return Object.entries(data)
      .filter(([path, progress]) => !progress.is_completed && path !== this.currentPostPath)
      .map(([path, progress]) => ({
        path,
        ...progress,
        title: this.extractTitle(path)
      }))
      .sort((a, b) => {
        // 按最近阅读时间排序
        return new Date(b.last_read || 0) - new Date(a.last_read || 0);
      });
  }

  /**
   * 从路径提取标题（简化实现）
   */
  extractTitle(path) {
    const data = this.getStoredData();
    return data[path]?.title || path.split('/').pop().replace(/\.html$/, '') || path;
  }

  /**
   * 格式化时间间隔
   */
  formatTimeAgo(isoString) {
    if (!isoString) return '未知';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} 分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours} 小时前`;
    } else if (diffDays < 7) {
      return `${diffDays} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  }

  /**
   * 注入"继续阅读"卡片样式
   */
  injectContinueReadingStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .continue-reading-card {
        background: #fff;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .continue-reading-card h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #333;
      }

      .unread-list {
        max-height: 300px;
        overflow-y: auto;
      }

      .unread-item {
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
      }

      .unread-item:last-child {
        border-bottom: none;
      }

      .unread-title {
        display: block;
        color: #49b1f5;
        text-decoration: none;
        font-weight: 500;
        margin-bottom: 4px;
      }

      .unread-title:hover {
        color: #00c4b6;
      }

      .unread-meta {
        display: flex;
        gap: 10px;
        font-size: 12px;
        color: #999;
      }

      .unread-percent {
        background: #f0f0f0;
        color: #333;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 500;
      }

      .view-all {
        text-align: center;
        padding: 8px;
        color: #666;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 检查同步配置
   */
  checkSyncConfig() {
    const config = this.getSyncConfig();

    if (config.gistId && config.gistToken) {
      this.gistId = config.gistId;
      this.gistToken = config.gistToken;

      // 从 Gist 加载进度
      this.loadFromGist();
    }
  }

  /**
   * 获取同步配置
   */
  getSyncConfig() {
    try {
      return JSON.parse(localStorage.getItem(this.syncKey) || '{}');
    } catch {
      return {};
    }
  }

  /**
   * 是否启用了同步
   */
  isSyncEnabled() {
    return !!(this.gistId && this.gistToken);
  }

  /**
   * 启动自动同步
   */
  startAutoSync() {
    setInterval(() => {
      this.syncToGist();
    }, this.syncInterval);
  }

  /**
   * 同步到 GitHub Gist
   */
  async syncToGist() {
    if (!this.isSyncEnabled()) return;

    try {
      const data = this.getStoredData();

      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${this.gistToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            'reading-progress.json': {
              content: JSON.stringify(data, null, 2),
              description: `Blog reading progress - Last updated: ${new Date().toISOString()}`
            }
          }
        })
      });

      if (response.ok) {
        this.lastSyncTime = new Date();
        console.log('Synced to Gist at:', this.lastSyncTime);
      } else {
        console.error('Failed to sync to Gist:', response.status);
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  }

  /**
   * 从 Gist 加载进度
   */
  async loadFromGist() {
    try {
      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        headers: {
          'Authorization': `token ${this.gistToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const gist = await response.json();
        const content = gist.files['reading-progress.json']?.content;

        if (content) {
          const gistData = JSON.parse(content);

          // 合并数据（本地优先）
          const localData = this.getStoredData();
          const mergedData = { ...gistData, ...localData };

          localStorage.setItem(this.storageKey, JSON.stringify(mergedData));
          console.log('Loaded from Gist:', Object.keys(gistData).length, 'entries');
        }
      }
    } catch (error) {
      console.error('Failed to load from Gist:', error);
    }
  }

  /**
   * 显示同步设置对话框（可选）
   */
  showSyncSetupDialog() {
    const config = this.getSyncConfig();
    const dialogHTML = `
      <div id="sync-setup-dialog" class="sync-dialog">
        <div class="sync-dialog-content">
          <h3>🔄 设置 Gist 同步</h3>
          <p class="sync-dialog-desc">
            输入你的 GitHub Gist 信息以启用跨设备阅读进度同步
          </p>
          <div class="sync-dialog-form">
            <div class="form-group">
              <label for="gist-id">Gist ID</label>
              <input
                type="text"
                id="gist-id"
                class="form-input"
                placeholder="例如：你的gist_id"
                value="${config.gistId || ''}"
              />
              <small>从 Gist URL 中获取，如：https://gist.github.com/你的gist_id</small>
            </div>
            <div class="form-group">
              <label for="gist-token">GitHub Token</label>
              <input
                type="password"
                id="gist-token"
                class="form-input"
                placeholder="ghp_你的token"
                value="${config.gistToken ? '****' : ''}"
              />
              <small>
                需要 <code>gist</code> 权限的 Personal Access Token
                <br>
                <a href="https://github.com/settings/tokens" target="_blank">创建 Token</a>
              </small>
            </div>
            <div class="form-actions">
              <button id="save-sync-btn" class="btn-primary">保存</button>
              <button id="cancel-sync-btn" class="btn-secondary">取消</button>
            </div>
          </div>
        </div>
      </div>
      <div class="sync-dialog-overlay"></div>
    `;

    document.body.insertAdjacentHTML('beforeend', dialogHTML);

    // 注入样式
    this.injectDialogStyles();

    // 绑定事件
    document.getElementById('save-sync-btn').addEventListener('click', () => this.saveSyncConfig());
    document.getElementById('cancel-sync-btn').addEventListener('click', () => this.closeSyncDialog());
    document.querySelector('.sync-dialog-overlay').addEventListener('click', () => this.closeSyncDialog());
  }

  /**
   * 保存同步配置
   */
  saveSyncConfig() {
    const gistId = document.getElementById('gist-id').value.trim();
    const gistToken = document.getElementById('gist-token').value.trim();

    if (!gistId || !gistToken) {
      alert('请填写完整的 Gist ID 和 Token');
      return;
    }

    const config = { gistId, gistToken };
    localStorage.setItem(this.syncKey, JSON.stringify(config));

    // 重新加载页面以应用配置
    location.reload();
  }

  /**
   * 关闭同步设置对话框
   */
  closeSyncDialog() {
    const dialog = document.getElementById('sync-setup-dialog');
    const overlay = document.querySelector('.sync-dialog-overlay');

    if (dialog) dialog.remove();
    if (overlay) overlay.remove();
  }

  /**
   * 注入对话框样式
   */
  injectDialogStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .sync-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .sync-dialog-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
      }

      .sync-dialog-content {
        background: #fff;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        position: relative;
        z-index: 10001;
      }

      .sync-dialog-content h3 {
        margin: 0 0 16px 0;
        color: #333;
      }

      .sync-dialog-desc {
        color: #666;
        margin-bottom: 20px;
        line-height: 1.5;
      }

      .form-group {
        margin-bottom: 16px;
      }

      .form-group label {
        display: block;
        font-weight: 500;
        margin-bottom: 8px;
        color: #333;
      }

      .form-input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        box-sizing: border-box;
      }

      .form-input:focus {
        outline: none;
        border-color: #49b1f5;
        box-shadow: 0 0 0 3px rgba(73, 177, 245, 0.1);
      }

      .form-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }

      .btn-primary, .btn-secondary {
        flex: 1;
        padding: 10px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      }

      .btn-primary {
        background: #49b1f5;
        color: #fff;
      }

      .btn-secondary {
        background: #f0f0f0;
        color: #333;
      }
    `;
    document.head.appendChild(style);
  }
}

// 初始化
if (typeof document !== 'undefined') {
  const readingTracker = new ReadingProgressTracker();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => readingTracker.init());
  } else {
    readingTracker.init();
  }

  // 提供全局访问接口（用于设置同步）
  window.ReadingProgressTracker = ReadingProgressTracker;
}
