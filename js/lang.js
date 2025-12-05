let currentLang = 'en';

export function initLanguageToggle() {
  const toggleBtn = document.getElementById('lang-toggle');

  toggleBtn.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'zh' : 'en';
    toggleBtn.textContent = currentLang === 'en' ? '中文' : 'English';
    updateLanguage();
  });

  // 页面加载时根据 currentLang 设置语言
  updateLanguage();
}

function updateLanguage() {
  // 1. 更新带 data-en / data-zh 的元素文本
  document.querySelectorAll('[data-en][data-zh]').forEach((el) => {
    // 如果 el 里有子节点 <strong> 等，保留它们，只替换文本节点
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = currentLang === 'en' ? el.dataset.en : el.dataset.zh;
      }
    });
  });

  // 2. 更新搜索框 placeholder
  const searchInput = document.getElementById('entry');
  if (searchInput) {
    const enPlaceholder = searchInput.dataset.enPlaceholder || 'Search a station/school/hospital/market';
    const zhPlaceholder = searchInput.dataset.zhPlaceholder || '搜索地铁站/学校/医院/市场';
    searchInput.placeholder = currentLang === 'en' ? enPlaceholder : zhPlaceholder;
  }

  // 3. 更新 select 默认选项
  const selectStation = document.querySelector('#select-station option[value=""]');
  if (selectStation) {
    const enStation = selectStation.dataset.en || '--Select a station--';
    const zhStation = selectStation.dataset.zh || '--选择地铁站--';
    selectStation.textContent = currentLang === 'en' ? enStation : zhStation;
  }

  const selectAmenity = document.querySelector('#select-amenity option[value=""]');
  if (selectAmenity) {
    const enAmenity = selectAmenity.dataset.en || '--Select an amenity--';
    const zhAmenity = selectAmenity.dataset.zh || '--选择设施--';
    selectAmenity.textContent = currentLang === 'en' ? enAmenity : zhAmenity;
  }
}

export function getCurrentLang() {
  return currentLang;
}
