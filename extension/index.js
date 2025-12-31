/**
 * SillyTavern Annual Summary Extension
 * 年度总结扩展 - 前端部分
 */

import { getRequestHeaders } from '../../../../script.js';
import { POPUP_TYPE, Popup } from '../../../popup.js';

const extensionName = 'third-party/annual-summary';

// Chart.js CDN
const CHART_JS_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
// 词云库
const WORDCLOUD_URL = 'https://cdn.jsdelivr.net/npm/wordcloud@1.2.2/src/wordcloud2.min.js';

let chartJsLoaded = false;
let wordcloudLoaded = false;

/**
 * 动态加载脚本
 */
async function loadScript(url) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${url}"]`);
        if (existing) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(script);
    });
}

async function ensureChartJs() {
    if (!chartJsLoaded) {
        await loadScript(CHART_JS_URL);
        chartJsLoaded = true;
    }
}

async function ensureWordcloud() {
    if (!wordcloudLoaded) {
        await loadScript(WORDCLOUD_URL);
        wordcloudLoaded = true;
    }
}

/**
 * 调用服务端API获取年度统计数据
 */
async function fetchAnnualSummary(year) {
    const response = await fetch('/api/plugins/annual-summary/generate', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ year })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
}

/**
 * 格式化数字
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * 创建统计卡片HTML
 */
function createStatsCardsHTML(data) {
    const cards = [
        { icon: 'fa-comments', label: '总会话数', value: formatNumber(data.totalSessions), color: '#4CAF50' },
        { icon: 'fa-message', label: '总消息数', value: formatNumber(data.totalMessages), color: '#2196F3' },
        { icon: 'fa-user', label: '你的消息', value: formatNumber(data.userMessages), color: '#FF9800' },
        { icon: 'fa-robot', label: 'AI 回复', value: formatNumber(data.aiMessages), color: '#9C27B0' },
        { icon: 'fa-coins', label: '累计Token', value: formatNumber(data.totalTokens), color: '#F44336' },
        { icon: 'fa-calendar-check', label: '活跃天数', value: data.activeDays, color: '#00BCD4' },
        { icon: 'fa-fire', label: '最长连续活跃', value: data.longestStreak + ' 天', color: '#FF5722' },
        { icon: 'fa-text-width', label: '平均消息长度', value: data.averageMessageLength + ' 字', color: '#795548' },
    ];
    
    return cards.map(card => `
        <div class="annual-summary-card" style="border-left: 4px solid ${card.color};">
            <div class="card-icon" style="color: ${card.color};">
                <i class="fa-solid ${card.icon}"></i>
            </div>
            <div class="card-content">
                <div class="card-value">${card.value}</div>
                <div class="card-label">${card.label}</div>
            </div>
        </div>
    `).join('');
}

/**
 * 创建角色排行榜HTML
 */
function createCharacterRankingHTML(characterStats) {
    if (!characterStats || characterStats.length === 0) {
        return '<p class="no-data">暂无角色数据</p>';
    }
    
    const top10 = characterStats.slice(0, 10);
    const maxCount = top10[0]?.messageCount || 1;
    
    return top10.map((char, index) => {
        const percentage = (char.messageCount / maxCount * 100).toFixed(1);
        const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`;
        
        return `
            <div class="ranking-item">
                <span class="ranking-medal">${medal}</span>
                <span class="ranking-name">${char.name}</span>
                <div class="ranking-bar-container">
                    <div class="ranking-bar" style="width: ${percentage}%;"></div>
                </div>
                <span class="ranking-count">${formatNumber(char.messageCount)}</span>
            </div>
        `;
    }).join('');
}

/**
 * 创建第一次聊天信息HTML
 */
function createFirstChatHTML(firstChat) {
    if (!firstChat) {
        return '<p class="no-data">未找到今年的聊天记录</p>';
    }
    
    const date = new Date(firstChat.date);
    const formattedDate = date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `
        <div class="first-chat-info">
            <div class="first-chat-character">
                <i class="fa-solid fa-star"></i>
                第一次对话角色：<strong>${firstChat.character}</strong>
            </div>
            <div class="first-chat-date">
                <i class="fa-solid fa-clock"></i>
                ${formattedDate}
            </div>
            <div class="first-chat-preview">
                "${firstChat.message}..."
            </div>
        </div>
    `;
}

/**
 * 创建记录HTML
 */
function createRecordsHTML(peakDay, longestMessage) {
    let html = '<div class="records-container">';
    
    if (peakDay && peakDay.date) {
        const date = new Date(peakDay.date);
        const formattedDate = date.toLocaleDateString('zh-CN', {
            month: 'long',
            day: 'numeric'
        });
        html += `
            <div class="record-item">
                <i class="fa-solid fa-chart-line"></i>
                <span>峰值日：${formattedDate} - ${peakDay.count} 条消息</span>
            </div>
        `;
    }
    
    if (longestMessage && longestMessage.length > 0) {
        html += `
            <div class="record-item">
                <i class="fa-solid fa-text-width"></i>
                <span>最长消息：${longestMessage.length} 字符</span>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

/**
 * 创建小时热力图
 */
function createHourlyChart(canvas, hourlyStats) {
    if (!canvas || !window.Chart) return;
    
    const ctx = canvas.getContext('2d');
    const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const maxValue = Math.max(...hourlyStats) || 1;
    
    const backgroundColors = hourlyStats.map(value => {
        const intensity = value / maxValue;
        return `rgba(255, 152, 0, ${0.2 + intensity * 0.8})`;
    });
    
    new window.Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: '消息数',
                data: hourlyStats,
                backgroundColor: backgroundColors,
                borderColor: 'rgba(255, 152, 0, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '24小时活跃分布',
                    color: '#fff'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });
}

/**
 * 创建星期统计图
 */
function createWeekdayChart(canvas, weekdayStats) {
    if (!canvas || !window.Chart) return;
    
    const ctx = canvas.getContext('2d');
    const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    new window.Chart(ctx, {
        type: 'polarArea',
        data: {
            labels,
            datasets: [{
                data: weekdayStats,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(199, 199, 199, 0.7)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '星期分布',
                    color: '#fff'
                },
                legend: {
                    labels: { color: '#aaa' }
                }
            }
        }
    });
}

/**
 * 创建月度趋势图
 */
function createMonthlyChart(canvas, monthlyStats) {
    if (!canvas || !window.Chart) return;
    
    const ctx = canvas.getContext('2d');
    const labels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    
    new window.Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: '消息数',
                data: monthlyStats,
                fill: true,
                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                borderColor: 'rgba(33, 150, 243, 1)',
                tension: 0.4,
                pointBackgroundColor: 'rgba(33, 150, 243, 1)',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '月度趋势',
                    color: '#fff'
                },
                legend: {
                    labels: { color: '#aaa' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });
}

/**
 * 创建每日趋势图
 */
function createDailyTrendChart(canvas, dailyStats) {
    if (!canvas || !window.Chart || !dailyStats || dailyStats.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    
    // 按月份聚合数据
    const monthlyData = {};
    for (const { date, count } of dailyStats) {
        const month = date.substring(0, 7);
        monthlyData[month] = (monthlyData[month] || 0) + count;
    }
    
    const labels = Object.keys(monthlyData).sort();
    const data = labels.map(month => monthlyData[month]);
    
    new window.Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(m => {
                const [year, month] = m.split('-');
                return `${month}/${year.slice(2)}`;
            }),
            datasets: [{
                label: '消息数',
                data,
                backgroundColor: 'rgba(76, 175, 80, 0.7)',
                borderColor: 'rgba(76, 175, 80, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '每日活动趋势',
                    color: '#fff'
                },
                legend: {
                    labels: { color: '#aaa' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });
}

/**
 * 创建词云
 */
function createWordCloud(canvas, wordFrequency) {
    if (!canvas || !window.WordCloud) return;
    
    if (!wordFrequency || wordFrequency.length === 0) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#888';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无词频数据', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const maxCount = wordFrequency[0]?.count || 1;
    const minSize = 14;
    const maxSize = 80;
    
    const list = wordFrequency.slice(0, 80).map(({ word, count }) => {
        const size = minSize + (count / maxCount) * (maxSize - minSize);
        return [word, size];
    });
    
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#C9CBCF', '#7BC225', '#E91E63', '#00BCD4'
    ];
    
    window.WordCloud(canvas, {
        list,
        gridSize: 8,
        weightFactor: 1,
        fontFamily: 'Microsoft YaHei, sans-serif',
        color: () => colors[Math.floor(Math.random() * colors.length)],
        rotateRatio: 0.3,
        rotationSteps: 2,
        backgroundColor: 'transparent',
        drawOutOfBound: false,
        shrinkToFit: true
    });
}

/**
 * 创建角色消息分布饼图
 */
function createCharacterPieChart(canvas, characterStats) {
    if (!canvas || !window.Chart || !characterStats || characterStats.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const top5 = characterStats.slice(0, 5);
    const othersCount = characterStats.slice(5).reduce((sum, c) => sum + c.messageCount, 0);
    
    const labels = [...top5.map(c => c.name)];
    const data = [...top5.map(c => c.messageCount)];
    
    if (othersCount > 0) {
        labels.push('其他');
        data.push(othersCount);
    }
    
    new window.Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#C9CBCF'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '角色分布',
                    color: '#fff'
                },
                legend: {
                    position: 'right',
                    labels: { color: '#aaa' }
                }
            }
        }
    });
}

/**
 * 显示年度总结弹窗
 */
async function showAnnualSummary(year = new Date().getFullYear()) {
    try {
        toastr.info('正在生成年度总结...', '请稍候', { timeOut: 0, extendedTimeOut: 0 });
        
        // 确保依赖库已加载
        await Promise.all([ensureChartJs(), ensureWordcloud()]);
        
        // 获取数据
        const data = await fetchAnnualSummary(year);
        
        toastr.clear();
        
        if (!data || data.totalMessages === 0) {
            toastr.warning(`${year}年没有找到聊天数据`);
            return;
        }
        
        // 创建弹窗内容
        const content = document.createElement('div');
        content.className = 'annual-summary-container';
        content.innerHTML = `
            <div class="annual-summary-header">
                <h1>✨ SillyTavern ${year} 年度总结 ✨</h1>
                <p>你的年度对话回顾</p>
            </div>
            
            <div class="annual-summary-section">
                <h2><i class="fa-solid fa-chart-simple"></i> 数据总览</h2>
                <div class="stats-cards">
                    ${createStatsCardsHTML(data)}
                </div>
            </div>
            
            <div class="annual-summary-section">
                <h2><i class="fa-solid fa-star"></i> 今年第一次对话</h2>
                ${createFirstChatHTML(data.firstChat)}
            </div>
            
            <div class="annual-summary-section">
                <h2><i class="fa-solid fa-trophy"></i> 角色互动排行榜 TOP10</h2>
                <div class="character-ranking">
                    ${createCharacterRankingHTML(data.characterStats)}
                </div>
            </div>
            
            <div class="annual-summary-section">
                <h2><i class="fa-solid fa-medal"></i> 记录</h2>
                ${createRecordsHTML(data.peakDay, data.longestMessage)}
            </div>
            
            <div class="annual-summary-section charts-section">
                <h2><i class="fa-solid fa-clock"></i> 时间分析</h2>
                <div class="charts-grid">
                    <div class="chart-container">
                        <canvas id="annualHourlyChart" width="400" height="300"></canvas>
                    </div>
                    <div class="chart-container">
                        <canvas id="annualWeekdayChart" width="400" height="300"></canvas>
                    </div>
                    <div class="chart-container">
                        <canvas id="annualMonthlyChart" width="400" height="300"></canvas>
                    </div>
                    <div class="chart-container">
                        <canvas id="annualDailyTrendChart" width="400" height="300"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="annual-summary-section">
                <h2><i class="fa-solid fa-pie-chart"></i> 角色分布</h2>
                <div class="chart-container single">
                    <canvas id="annualCharacterPieChart" width="600" height="350"></canvas>
                </div>
            </div>
            
            <div class="annual-summary-section">
                <h2><i class="fa-solid fa-cloud"></i> 高频词云</h2>
                <div class="wordcloud-container">
                    <canvas id="annualWordcloudCanvas" width="800" height="400"></canvas>
                </div>
            </div>
            
            <div class="annual-summary-footer">
                <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
            </div>
        `;
        
        // 显示弹窗
        const popup = new Popup(content, POPUP_TYPE.TEXT, '', {
            wide: true,
            large: true,
            okButton: '关闭',
            allowVerticalScrolling: true
        });
        
        popup.show();
        
        // 等待DOM完全渲染
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 获取canvas元素并创建图表
        const hourlyCanvas = document.getElementById('annualHourlyChart');
        const weekdayCanvas = document.getElementById('annualWeekdayChart');
        const monthlyCanvas = document.getElementById('annualMonthlyChart');
        const dailyTrendCanvas = document.getElementById('annualDailyTrendChart');
        const characterPieCanvas = document.getElementById('annualCharacterPieChart');
        const wordcloudCanvas = document.getElementById('annualWordcloudCanvas');
        
        console.log('[Annual Summary] Creating charts...', {
            hourlyCanvas: !!hourlyCanvas,
            weekdayCanvas: !!weekdayCanvas,
            monthlyCanvas: !!monthlyCanvas,
            dailyTrendCanvas: !!dailyTrendCanvas,
            characterPieCanvas: !!characterPieCanvas,
            wordcloudCanvas: !!wordcloudCanvas,
            chartJs: !!window.Chart,
            wordCloud: !!window.WordCloud
        });
        
        if (hourlyCanvas) createHourlyChart(hourlyCanvas, data.hourlyStats);
        if (weekdayCanvas) createWeekdayChart(weekdayCanvas, data.weekdayStats);
        if (monthlyCanvas) createMonthlyChart(monthlyCanvas, data.monthlyStats);
        if (dailyTrendCanvas) createDailyTrendChart(dailyTrendCanvas, data.dailyStats);
        if (characterPieCanvas) createCharacterPieChart(characterPieCanvas, data.characterStats);
        if (wordcloudCanvas) createWordCloud(wordcloudCanvas, data.userWordFrequency);
        
        console.log('[Annual Summary] Charts created');
        
    } catch (error) {
        toastr.clear();
        console.error('[Annual Summary] Error:', error);
        toastr.error(`生成年度总结失败: ${error.message}`);
    }
}

/**
 * 添加菜单按钮
 */
function addMenuButton() {
    const buttonHtml = `
        <div id="annual_summary_button" class="list-group-item flex-container flexGap5" title="年度总结">
            <i class="fa-solid fa-calendar-days extensionsMenuExtensionButton"></i>
            <span>年度总结</span>
        </div>
    `;
    
    $('#extensionsMenu').append(buttonHtml);
    
    $('#annual_summary_button').on('click', async () => {
        const currentYear = new Date().getFullYear();
        
        const yearInput = await Popup.show.input(
            '选择年份',
            '请输入要查看的年份:',
            currentYear.toString(),
            { rows: 1 }
        );
        
        if (yearInput) {
            const year = parseInt(yearInput);
            if (!isNaN(year) && year >= 2000 && year <= currentYear) {
                await showAnnualSummary(year);
            } else {
                toastr.warning(`请输入有效的年份 (2000-${currentYear})`);
            }
        }
    });
}

// 初始化
(function init() {
    addMenuButton();
    console.log('[Annual Summary] Extension loaded');
})();