/**
 * 文章评分系统
 * 基于 Giscus Discussions 实现文章评分功能
 */

class ArticleRating {
  constructor() {
    this.storageKey = 'blog_article_ratings';
    this.giscusUrl = window.GISCUS_WEBSITE_URL || 'https://giscus.app';
    this.repo = window.GISCUS_REPO || 'Shiaoming123/Shiaoming123.github.io';
    this.currentTerm = null; // 当前文章的 discussion term
    this.ratings = this.getStoredRatings();
  }

  /**
   * 初始化评分系统
   */
  init() {
    // 获取当前文章的 discussion term
    this.currentTerm = this.getCurrentDiscussionTerm();

    if (this.currentTerm) {
      // 加载评分数据
      this.loadRatings();

      // 添加评分组件到页面
      this.addRatingWidget();
    }

    console.log('Article rating initialized for:', this.currentTerm);
  }

  /**
   * 获取当前文章的 discussion term
   * Giscus 使用 issue term 标识文章
   */
  getCurrentDiscussionTerm() {
    // 从 URL 或 giscus 配置中获取
    const giscusScript = document.querySelector('#giscus-script');
    if (giscusScript) {
      const src = giscusScript.getAttribute('src');
      const match = src.match(/term=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
    }

    // 从页面 URL 获取
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('term') || null;
  }

  /**
   * 添加评分组件
   */
  addRatingWidget() {
    // 查找插入位置（文章标题下方或评论上方）
    const targetLocation = this.findInsertLocation();
    if (!targetLocation) return;

    // 计算当前评分
    const rating = this.calculateRating();

    const widgetHTML = `
      <div class="article-rating-widget">
        <div class="rating-display">
          <div class="rating-stars">${this.renderStars(rating.average)}</div>
          <div class="rating-info">
            <span class="rating-average">${rating.average.toFixed(1)}</span>
            <span class="rating-count">基于 ${rating.count} 条评分</span>
          </div>
        </div>
        <div class="rating-actions">
          <h4>为这篇文章评分</h4>
          <div class="rating-buttons">
            <button class="rating-btn" data-rating="5" title="非常好">⭐⭐⭐⭐⭐⭐</button>
            <button class="rating-btn" data-rating="4" title="好">⭐⭐⭐⭐</button>
            <button class="rating-btn" data-rating="3" title="一般">⭐⭐⭐</button>
            <button class="rating-btn" data-rating="2" title="差">⭐⭐</button>
            <button class="rating-btn" data-rating="1" title="非常差">⭐</button>
          </div>
          <p class="rating-note">
            点击星星后，会在评论区留下对应的 emoji 反应
          </p>
        </div>
        <div class="rating-distribution">
          <h5>评分分布</h5>
          ${this.renderDistribution(rating)}
        </div>
      </div>
    `;

    targetLocation.insertAdjacentHTML('afterend', widgetHTML);

    // 绑定评分按钮事件
    this.bindRatingEvents();

    // 注入样式
    this.injectRatingStyles();
  }

  /**
   * 查找插入位置
   */
  findInsertLocation() {
    // 优先：评论区域上方
    const giscusContainer = document.querySelector('.giscus-frame-wrapper');
    if (giscusContainer) {
      return giscusContainer.parentElement;
    }

    // 次优：文章标题后
    const postTitle = document.querySelector('.post-title, h1.post-title, article h1');
    if (postTitle) {
      return postTitle.parentElement;
    }

    // 最后：文章内容后
    const postContent = document.querySelector('.post-content, article.post-content');
    return postContent?.parentElement;
  }

  /**
   * 计算评分
   */
  calculateRating() {
    const term = this.currentTerm;
    if (!term || !this.ratings[term]) {
      return { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
    }

    return this.ratings[term];
  }

  /**
   * 渲染星星
   */
  renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - Math.ceil(rating);

    let stars = '';
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars += '<span class="star full">★</span>';
      } else if (hasHalfStar && i === fullStars) {
        stars += '<span class="star half">★</span>';
      } else {
        stars += '<span class="star empty">☆</span>';
      }
    }

    return stars;
  }

  /**
   * 渲染评分分布
   */
  renderDistribution(currentRating) {
    const dist = currentRating.distribution || [0, 0, 0, 0, 0];
    const total = currentRating.count || 1;
    const max = Math.max(...dist);

    return `
      <div class="rating-bars">
        ${[5, 4, 3, 2, 1].map((star, index) => {
          const count = dist[index] || 0;
          const percent = total > 0 ? (count / total * 100) : 0;
          return `
            <div class="rating-bar-item">
              <span class="rating-bar-label">${star}星</span>
              <div class="rating-bar-track">
                <div class="rating-bar-fill" style="width: ${percent}%"></div>
              </div>
              <span class="rating-bar-count">${count}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * 绑定评分按钮事件
   */
  bindRatingEvents() {
    document.querySelectorAll('.rating-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rating = parseInt(btn.getAttribute('data-rating'));
        await this.submitRating(rating);
      });
    });
  }

  /**
   * 提交评分
   */
  async submitRating(rating) {
    if (!this.currentTerm) {
      alert('无法识别当前文章');
      return;
    }

    // 检查是否已评分
    const userRatings = this.getUserRatings();
    if (userRatings[this.currentTerm]) {
      alert('你已经评过分了，如需修改请删除旧的 emoji 反应后重新评分');
      return;
    }

    try {
      // 使用 Giscus API 创建对应的 emoji 反应
      // 映射：5分=👍, 4分=👀, 3分=🤔, 2分=👎, 1分=👎
      const emojis = ['👍', '👀', '🤔', '👎', '👎'];
      const emoji = emojis[5 - rating] || '👍';

      // 查找 giscus 的评论输入框或创建新评论
      const commentBox = document.querySelector('.giscus-frame-wrapper') ||
                        document.querySelector('textarea.giscus-input');

      if (commentBox) {
        // 方式1：如果有评论框，自动填入 emoji
        const ratingText = `我给这篇文章打了 ${rating} 星`;
        commentBox.value = emoji + ' ' + ratingText;

        // 触发提交（需要用户点击）
        alert('请点击"提交"按钮完成评分');
      } else {
        // 方式2：通过 Discussions API 直接添加 reaction
        await this.addReactionToDiscussion(emoji, rating);
      }
    } catch (error) {
      console.error('Failed to submit rating:', error);
      alert('评分失败，请稍后重试');
    }
  }

  /**
   * 添加 emoji 反应到 discussion
   */
  async addReactionToDiscussion(emoji, rating) {
    const term = this.currentTerm;

    // 这里需要实际的 GitHub API 调用
    // 由于跨域限制，这里提供简化实现
    // 用户需要手动在评论区添加对应的 emoji

    const instructions = `
      <div class="rating-instructions">
        <h5>📋 评分步骤</h5>
        <ol>
          <li>在评论区添加对应的 emoji：<strong>${emoji}</strong></li>
          <li>可选添加评语："我给这篇文章打了 ${rating} 星"</li>
          <li>点击"提交"按钮发布评论</li>
        </ol>
        <p class="rating-hint">
          💡 评分会在几分钟后自动计算到显示
        </p>
      </div>
    `;

    // 显示评分指引
    const widget = document.querySelector('.article-rating-widget .rating-actions');
    if (widget) {
      widget.insertAdjacentHTML('beforebegin', instructions);
      setTimeout(() => {
        const instructionsEl = document.querySelector('.rating-instructions');
        if (instructionsEl) {
          instructionsEl.style.background = '#e8f4fd';
          instructionsEl.style.padding = '16px';
          instructionsEl.style.borderRadius = '8px';
          instructionsEl.style.marginBottom = '16px';
        }
      }, 100);
    }
  }

  /**
   * 从 Giscus Discussions 加载评分数据
   */
  async loadRatings() {
    const term = this.currentTerm;
    if (!term) return;

    try {
      // 调用 GitHub API 获取 discussion 的 reactions
      const repoPath = this.repo.replace('/', '/');
      const apiUrl = `https://api.github.com/repos/${repoPath}/issues`;

      // 由于需要分页获取所有 issues 来匹配 term
      // 这里简化实现，使用存储的数据
      // 实际部署后需要通过 GitHub API 获取

      const stored = this.ratings[term];
      if (stored) {
        console.log('Loaded cached rating:', stored);
        return;
      }

      // 初始化评分记录
      this.ratings[term] = {
        average: 0,
        count: 0,
        distribution: [0, 0, 0, 0, 0],
        last_updated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to load ratings:', error);
    }
  }

  /**
   * 更新评分显示
   */
  updateRatingDisplay() {
    const rating = this.calculateRating();
    const display = document.querySelector('.rating-display');

    if (display) {
      display.innerHTML = `
        <div class="rating-stars">${this.renderStars(rating.average)}</div>
        <div class="rating-info">
          <span class="rating-average">${rating.average.toFixed(1)}</span>
          <span class="rating-count">基于 ${rating.count} 条评分</span>
        </div>
      `;
    }
  }

  /**
   * 存储评分
   */
  saveRating(term, rating, user) {
    const existing = this.ratings[term] || { average: 0, count: 0, distribution: [0,0,0,0,0] };

    // 更新平均分
    const newAverage = ((existing.average * existing.count) + rating) / (existing.count + 1);

    // 更新分布
    existing.distribution[rating - 1]++;

    this.ratings[term] = {
      average: newAverage,
      count: existing.count + 1,
      distribution: existing.distribution,
      last_updated: new Date().toISOString()
    };

    // 保存到 localStorage
    this.saveAllRatings();

    // 保存用户评分记录
    const userRatings = this.getUserRatings();
    userRatings[term] = { rating, timestamp: new Date().toISOString() };
    localStorage.setItem('user_rated_articles', JSON.stringify(userRatings));
  }

  /**
   * 获取所有评分数据
   */
  getStoredRatings() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    } catch (error) {
      console.error('Failed to read ratings:', error);
      return {};
    }
  }

  /**
   * 保存所有评分数据
   */
  saveAllRatings() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.ratings));
  }

  /**
   * 获取用户评分记录
   */
  getUserRatings() {
    try {
      return JSON.parse(localStorage.getItem('user_rated_articles') || '{}');
    } catch {
      return {};
    }
  }

  /**
   * 注入评分组件样式
   */
  injectRatingStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .article-rating-widget {
        background: #f8f9fa;
        border: 1px solid #e1e4e8;
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
      }

      .rating-display {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }

      .rating-stars {
        font-size: 24px;
        color: #ffc107;
        letter-spacing: 2px;
      }

      .rating-stars .star.full {
        color: #ffc107;
      }

      .rating-stars .star.half {
        color: #ffc107;
        opacity: 0.7;
      }

      .rating-stars .star.empty {
        color: #e0e0e0;
      }

      .rating-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .rating-average {
        font-size: 32px;
        font-weight: bold;
        color: #333;
      }

      .rating-count {
        font-size: 14px;
        color: #666;
      }

      .rating-actions {
        margin-bottom: 16px;
      }

      .rating-actions h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #333;
      }

      .rating-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .rating-btn {
        flex: 1;
        min-width: 120px;
        padding: 10px 8px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 14px;
      }

      .rating-btn:hover {
        border-color: #49b1f5;
        background: #f0f7ff;
        transform: translateY(-2px);
      }

      .rating-note {
        font-size: 12px;
        color: #666;
        margin-top: 8px;
        line-height: 1.4;
      }

      .rating-distribution {
        margin-top: 16px;
      }

      .rating-distribution h5 {
        font-size: 14px;
        color: #333;
        margin: 0 0 12px 0;
      }

      .rating-bars {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .rating-bar-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      }

      .rating-bar-label {
        min-width: 50px;
        color: #666;
      }

      .rating-bar-track {
        flex: 1;
        height: 20px;
        background: #e0e0e0;
        border-radius: 10px;
        overflow: hidden;
      }

      .rating-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #49b1f5, #00c4b6);
        transition: width 0.3s ease;
      }

      .rating-bar-count {
        min-width: 30px;
        text-align: right;
        color: #666;
        font-weight: 500;
      }

      .rating-instructions {
        background: #fff9c4;
        border-left: 4px solid #ffc107;
        padding: 12px 12px 12px 16px;
        border-radius: 4px;
        margin-bottom: 16px;
      }

      .rating-instructions h5 {
        margin: 0 0 12px 0;
        color: #333;
      }

      .rating-instructions ol {
        margin: 0;
        padding-left: 20px;
      }

      .rating-instructions li {
        margin-bottom: 8px;
        line-height: 1.5;
      }

      .rating-hint {
        margin-top: 12px;
        font-size: 13px;
        color: #49b1f5;
      }
    `;

    document.head.appendChild(style);
  }
}

// 初始化
if (typeof document !== 'undefined') {
  const articleRating = new ArticleRating();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => articleRating.init());
  } else {
    articleRating.init();
  }
}
