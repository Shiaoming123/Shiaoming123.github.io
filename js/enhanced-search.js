/**
 * 增强搜索组件
 * 支持标签过滤、排序、搜索建议
 */

class EnhancedSearch {
  constructor() {
    this.searchData = [];
    this.activeFilters = {
      tags: [],
      categories: [],
      series: []
    };
    this.sortBy = 'relevance'; // relevance, date, rating, reading_time
    this.searchHistory = this.getSearchHistory();
    this.currentQuery = '';
  }

  /**
   * 初始化搜索功能
   */
  async init() {
    // 加载搜索数据
    try {
      const response = await fetch('/search.xml');
      const text = await response.text();
      this.searchData = this.parseSearchXML(text);
      console.log('Search data loaded:', this.searchData.length, 'entries');
    } catch (error) {
      console.error('Failed to load search data:', error);
    }

    // 绑定搜索框事件
    this.bindEvents();
  }

  /**
   * 解析 search.xml
   */
  parseSearchXML(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const entries = xmlDoc.querySelectorAll('entry');

    return Array.from(entries).map(entry => {
      const allTags = entry.querySelector('tags')?.textContent || '';
      const allCategories = entry.querySelector('categories')?.textContent || '';

      return {
        title: entry.querySelector('title')?.textContent || '',
        content: entry.querySelector('content')?.textContent || '',
        url: entry.querySelector('url')?.textContent || '',
        tags: allTags ? allTags.split(',').map(t => t.trim()) : [],
        categories: allCategories ? allCategories.split(',').map(c => c.trim()) : [],
        date: entry.querySelector('date')?.textContent || '',
        wordCount: parseInt(entry.querySelector('word_count')?.textContent || '0'),
        readingTime: parseInt(entry.querySelector('reading_time')?.textContent || '0'),
        series: entry.querySelector('series')?.textContent || null
      };
    });
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    const searchInput = document.querySelector('.search-input') || document.getElementById('search-input');

    if (searchInput) {
      // 搜索输入事件（防抖）
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.handleSearch(e.target.value);
        }, 300);
      });

      // 回车键搜索
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSearch(e.target.value);
        }
      });
    }

    // 绑定过滤器按钮
    this.bindFilterEvents();
  }

  /**
   * 绑定过滤器事件
   */
  bindFilterEvents() {
    // 检查是否已有过滤器 UI，没有则创建
    if (!document.querySelector('.search-filters')) {
      this.createFilterUI();
    }
  }

  /**
   * 创建过滤器 UI
   */
  createFilterUI() {
    const searchContainer = document.querySelector('.search-box') || document.querySelector('#content-hexo-blog-search');
    if (!searchContainer) return;

    const filterHTML = `
      <div class="search-filters">
        <div class="filter-section">
          <h4>标签过滤</h4>
          <div class="filter-tags" id="filter-tags"></div>
        </div>
        <div class="filter-section">
          <h4>排序方式</h4>
          <select id="sort-select" class="sort-select">
            <option value="relevance">相关度</option>
            <option value="date">发布日期</option>
            <option value="reading_time">阅读时长</option>
          </select>
        </div>
      </div>
    `;

    searchContainer.insertAdjacentHTML('beforeend', filterHTML);

    // 填充热门标签
    this.populatePopularTags();

    // 绑定排序选择事件
    document.getElementById('sort-select').addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      if (this.currentQuery) {
        this.handleSearch(this.currentQuery);
      }
    });
  }

  /**
   * 填充热门标签
   */
  populatePopularTags() {
    // 统计所有标签的使用频率
    const tagCounts = {};
    this.searchData.forEach(item => {
      item.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // 取前 20 个热门标签
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const filterTagsContainer = document.getElementById('filter-tags');
    filterTagsContainer.innerHTML = sortedTags.map(([tag, count]) =>
      `<span class="filter-tag" data-tag="${tag}">
        ${tag} <small>(${count})</small>
      </span>`
    ).join('');

    // 绑定标签点击事件
    filterTagsContainer.querySelectorAll('.filter-tag').forEach(tagEl => {
      tagEl.addEventListener('click', () => {
        const tag = tagEl.getAttribute('data-tag');
        this.toggleTagFilter(tag);
      });
    });
  }

  /**
   * 切换标签过滤器
   */
  toggleTagFilter(tag) {
    const index = this.activeFilters.tags.indexOf(tag);
    if (index > -1) {
      this.activeFilters.tags.splice(index, 1);
      document.querySelector(`.filter-tag[data-tag="${tag}"]`)?.classList.remove('active');
    } else {
      this.activeFilters.tags.push(tag);
      document.querySelector(`.filter-tag[data-tag="${tag}"]`)?.classList.add('active');
    }

    if (this.currentQuery) {
      this.handleSearch(this.currentQuery);
    }
  }

  /**
   * 处理搜索
   */
  handleSearch(query) {
    this.currentQuery = query.trim();

    if (!this.currentQuery) {
      this.showAllResults();
      return;
    }

    // 保存到搜索历史
    this.saveToSearchHistory(this.currentQuery);

    // 执行搜索
    const results = this.search(query);

    // 显示结果
    this.displayResults(results);
  }

  /**
   * 搜索算法
   */
  search(query) {
    const lowerQuery = query.toLowerCase();

    return this.searchData.filter(item => {
      // 必须匹配所有激活的过滤器
      if (!this.matchesFilters(item)) return false;

      // 计算相关度分数
      const score = this.calculateRelevance(item, lowerQuery);

      return score > 0;
    }).sort((a, b) => {
      return this.sortResults(a, b, lowerQuery);
    });
  }

  /**
   * 检查是否匹配过滤器
   */
  matchesFilters(item) {
    // 标签过滤
    if (this.activeFilters.tags.length > 0) {
      const hasMatchingTag = this.activeFilters.tags.some(tag =>
        item.tags.includes(tag)
      );
      if (!hasMatchingTag) return false;
    }

    // 分类过滤（可扩展）
    if (this.activeFilters.categories.length > 0) {
      const hasMatchingCategory = this.activeFilters.categories.some(cat =>
        item.categories.includes(cat)
      );
      if (!hasMatchingCategory) return false;
    }

    return true;
  }

  /**
   * 计算相关度分数
   */
  calculateRelevance(item, query) {
    let score = 0;

    // 标题匹配权重最高
    if (item.title.toLowerCase().includes(query)) {
      score += 10;
    }

    // 标签匹配
    if (item.tags.some(tag => tag.toLowerCase().includes(query))) {
      score += 5;
    }

    // 内容匹配
    if (item.content.toLowerCase().includes(query)) {
      score += 1;
    }

    return score;
  }

  /**
   * 排序结果
   */
  sortResults(a, b, query) {
    switch (this.sortBy) {
      case 'date':
        return new Date(b.date) - new Date(a.date);

      case 'reading_time':
        return b.readingTime - a.readingTime;

      case 'relevance':
      default:
        return this.calculateRelevance(b, query) - this.calculateRelevance(a, query);
    }
  }

  /**
   * 显示搜索结果
   */
  displayResults(results) {
    const searchResults = document.querySelector('.search-result-show') || document.getElementById('search-result');

    if (!searchResults) return;

    if (results.length === 0) {
      searchResults.innerHTML = `
        <div class="search-no-results">
          <p>未找到匹配的结果</p>
          <p>尝试：</p>
          <ul>
            <li>使用不同的关键词</li>
            <li>减少标签过滤器</li>
            <li>检查拼写错误</li>
          </ul>
        </div>
      `;
      return;
    }

    searchResults.innerHTML = results.map((item, index) => `
      <article class="search-result-item" style="animation-delay: ${index * 0.05}s">
        <div class="search-result-content">
          <h2 class="search-result-title">
            <a href="${item.url}">${this.highlightText(item.title, this.currentQuery)}</a>
          </h2>
          <div class="search-result-meta">
            <span class="search-result-tags">
              ${item.tags.slice(0, 3).map(tag =>
                `<span class="tag">${tag}</span>`
              ).join('')}
            </span>
            <span class="search-result-date">
              ${new Date(item.date).toLocaleDateString('zh-CN')}
            </span>
            ${item.readingTime > 0 ?
              `<span class="search-result-time">
                ⏱ ${item.readingTime} 分钟
              </span>` : ''}
          </div>
          ${item.series ? `
            <div class="search-result-series">
              📚 系列：${item.series}
            </div>
          ` : ''}
          <p class="search-result-excerpt">
            ${this.getExcerpt(item.content, this.currentQuery)}
          </p>
        </div>
      </article>
    `).join('');

    // 添加结果统计
    const statsHTML = `
      <div class="search-stats">
        找到 ${results.length} 个结果
        ${this.activeFilters.tags.length > 0 ?
          `<span class="active-filters">
            激活标签：${this.activeFilters.tags.join(', ')}
            <button class="clear-filters">清除</button>
          </span>` : ''}
      </div>
    `;

    searchResults.insertAdjacentHTML('beforebegin', statsHTML);

    // 绑定"清除过滤器"按钮
    document.querySelector('.clear-filters')?.addEventListener('click', () => {
      this.activeFilters.tags = [];
      document.querySelectorAll('.filter-tag.active').forEach(el => el.classList.remove('active'));
      if (this.currentQuery) this.handleSearch(this.currentQuery);
    });
  }

  /**
   * 高亮搜索关键词
   */
  highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * 获取摘要（截取并高亮）
   */
  getExcerpt(content, query) {
    const cleanContent = content.replace(/<[^>]+>/g, ''); // 移除 HTML 标签
    const index = cleanContent.toLowerCase().indexOf(query.toLowerCase());

    if (index === -1) {
      return cleanContent.substring(0, 150) + '...';
    }

    // 从匹配位置前后各取 50 个字符
    const start = Math.max(0, index - 50);
    const end = Math.min(cleanContent.length, index + query.length + 50);

    return (start > 0 ? '...' : '') +
           cleanContent.substring(start, end) +
           (end < cleanContent.length ? '...' : '');
  }

  /**
   * 显示所有结果（当搜索框为空）
   */
  showAllResults() {
    // 可以显示所有文章或显示推荐文章
    const sortedByDate = [...this.searchData].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    ).slice(0, 10);

    this.displayResults(sortedByDate);
  }

  /**
   * 搜索历史管理
   */
  getSearchHistory() {
    try {
      return JSON.parse(localStorage.getItem('search_history') || '[]');
    } catch {
      return [];
    }
  }

  saveToSearchHistory(query) {
    const history = this.getSearchHistory();
    // 避免重复
    const filtered = history.filter(h => h !== query);
    filtered.unshift(query);
    // 只保留最近 10 条
    const trimmed = filtered.slice(0, 10);
    localStorage.setItem('search_history', JSON.stringify(trimmed));
  }
}

// 初始化
if (typeof document !== 'undefined') {
  const enhancedSearch = new EnhancedSearch();

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => enhancedSearch.init());
  } else {
    enhancedSearch.init();
  }
}
