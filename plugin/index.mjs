/**
 * SillyTavern Annual Summary Plugin
 * 年度总结插件 - 服务端部分
 *
 * 功能：
 * - 读取并分析全年聊天记录
 * - 统计各维度数据
 * - 提供API接口给前端扩展
 */

import path from 'path';
import fs from 'fs/promises';
import { existsSync, createReadStream, readFileSync, readdirSync } from 'fs';
import readline from 'readline';

// 插件元信息
export const info = {
    id: 'annual-summary',
    name: 'Annual Summary',
    description: '年度聊天总结插件 - 分析您一年的聊天数据并生成可视化报告',
};

// 缓存存储
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 解析时间戳 - 支持多种格式
 */
function parseTimestamp(timestamp) {
    if (!timestamp) return null;
    
    if (timestamp instanceof Date) {
        return isNaN(timestamp.getTime()) ? null : timestamp;
    }
    
    if (typeof timestamp === 'number') {
        const date = timestamp > 1e12 ? new Date(timestamp) : new Date(timestamp * 1000);
        return isNaN(date.getTime()) ? null : date;
    }
    
    if (typeof timestamp === 'string') {
        let date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
        
        const humanizedMatch = timestamp.match(/^(\w+)\s+(\d+),?\s*(\d{4})?\s*@?\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i);
        if (humanizedMatch) {
            const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                           'july', 'august', 'september', 'october', 'november', 'december'];
            const month = months.indexOf(humanizedMatch[1].toLowerCase());
            const day = parseInt(humanizedMatch[2]);
            const year = humanizedMatch[3] ? parseInt(humanizedMatch[3]) : new Date().getFullYear();
            let hour = parseInt(humanizedMatch[4]);
            const minute = parseInt(humanizedMatch[5]);
            const ampm = humanizedMatch[6]?.toLowerCase();
            
            if (ampm === 'pm' && hour !== 12) hour += 12;
            if (ampm === 'am' && hour === 12) hour = 0;
            
            if (month >= 0) {
                date = new Date(year, month, day, hour, minute);
                if (!isNaN(date.getTime())) return date;
            }
        }
        
        const num = parseInt(timestamp);
        if (!isNaN(num)) {
            date = num > 1e12 ? new Date(num) : new Date(num * 1000);
            if (!isNaN(date.getTime())) return date;
        }
    }
    
    return null;
}

/**
 * 读取JSONL聊天文件
 */
async function readChatFile(filePath) {
    const messages = [];
    let metadata = null;
    
    try {
        const fileStream = createReadStream(filePath, { encoding: 'utf8' });
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        
        let isFirstLine = true;
        
        for await (const line of rl) {
            if (!line.trim()) continue;
            
            try {
                const parsed = JSON.parse(line);
                
                if (isFirstLine && parsed.chat_metadata !== undefined) {
                    metadata = parsed;
                    isFirstLine = false;
                    continue;
                }
                
                messages.push(parsed);
                isFirstLine = false;
            } catch (e) {
                // 跳过无法解析的行
            }
        }
    } catch (error) {
        console.error(`Error reading chat file ${filePath}:`, error);
    }
    
    return { metadata, messages };
}

/**
 * 获取指定年份的日期范围
 */
function getYearRange(year) {
    const start = new Date(year, 0, 1, 0, 0, 0, 0);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    return { start, end };
}

/**
 * 简单的PNG文本块解析器
 */
function extractPngText(buffer) {
    try {
        if (buffer[0] !== 137 || buffer[1] !== 80 || buffer[2] !== 78 || buffer[3] !== 71) {
            return null;
        }
        
        let offset = 8;
        
        while (offset < buffer.length) {
            const length = buffer.readUInt32BE(offset);
            offset += 4;
            
            const type = buffer.slice(offset, offset + 4).toString('ascii');
            offset += 4;
            
            if (type === 'tEXt') {
                const chunkData = buffer.slice(offset, offset + length);
                const nullIndex = chunkData.indexOf(0);
                if (nullIndex > 0) {
                    const keyword = chunkData.slice(0, nullIndex).toString('ascii');
                    if (keyword === 'chara') {
                        const textData = chunkData.slice(nullIndex + 1).toString('utf8');
                        return Buffer.from(textData, 'base64').toString('utf8');
                    }
                }
            }
            
            offset += length + 4;
            
            if (type === 'IEND') break;
        }
    } catch (e) {
        // 忽略解析错误
    }
    return null;
}

/**
 * 读取角色卡数据
 */
async function readCharacterCard(imgPath) {
    try {
        const buffer = readFileSync(imgPath);
        const jsonStr = extractPngText(buffer);
        if (jsonStr) {
            return JSON.parse(jsonStr);
        }
    } catch (error) {
        // 忽略解析错误
    }
    return null;
}

/**
 * 获取每个角色当前选中的聊天文件
 */
async function getActiveChats(userDataPath) {
    const activeChats = [];
    const charactersDir = path.join(userDataPath, 'characters');
    const chatsDir = path.join(userDataPath, 'chats');
    
    try {
        const entries = readdirSync(charactersDir, { withFileTypes: true });
        
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.png')) {
                continue;
            }
            
            const imgPath = path.join(charactersDir, entry.name);
            const card = await readCharacterCard(imgPath);
            
            if (card && card.chat) {
                const characterName = card.name || card.data?.name || entry.name.replace('.png', '');
                const chatFileName = `${card.chat}.jsonl`;
                const charFolder = entry.name.replace('.png', '');
                const chatPath = path.join(chatsDir, charFolder, chatFileName);
                
                if (existsSync(chatPath)) {
                    activeChats.push({
                        characterName,
                        chatFile: chatPath
                    });
                }
            }
        }
    } catch (error) {
        console.error('[Annual Summary] Error reading characters:', error);
    }
    
    return activeChats;
}

/**
 * 获取群组聊天的当前活跃聊天
 */
async function getActiveGroupChats(userDataPath) {
    const activeChats = [];
    const groupsDir = path.join(userDataPath, 'groups');
    const groupChatsDir = path.join(userDataPath, 'group chats');
    
    try {
        if (!existsSync(groupsDir)) return activeChats;
        
        const files = readdirSync(groupsDir);
        
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            
            try {
                const groupPath = path.join(groupsDir, file);
                const groupData = JSON.parse(readFileSync(groupPath, 'utf8'));
                
                if (groupData.chat_id) {
                    const chatPath = path.join(groupChatsDir, `${groupData.chat_id}.jsonl`);
                    if (existsSync(chatPath)) {
                        activeChats.push({
                            groupName: groupData.name || 'Unknown Group',
                            chatFile: chatPath
                        });
                    }
                }
            } catch (e) {
                // 忽略无法解析的群组文件
            }
        }
    } catch (error) {
        console.error('[Annual Summary] Error reading groups:', error);
    }
    
    return activeChats;
}

/**
 * 停用词列表
 */
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'can', 'need', 'dare', 'ought', 'used', 'to',
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
    'you', 'your', 'yours', 'yourself', 'yourselves',
    'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
    'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
    'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while',
    'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 's', 't', 'just', 'don', 'now', 'll', 'm', 've', 'd', 're',
    'ok', 'okay', 'yes', 'no', 'yeah', 'nah', 'oh', 'ah', 'um', 'uh', 
    'hm', 'hmm', 'huh', 'well', 'like', 'really',
    '的', '了', '是', '在', '我', '你', '他', '她', '它', '们', '这', '那',
    '有', '和', '与', '或', '但', '而', '因', '为', '所', '以', '也', '就',
    '都', '要', '会', '能', '可', '到', '着', '被', '让', '给', '从', '向',
    '把', '对', '很', '太', '更', '最', '不', '没', '无', '非', '别', '还',
    '又', '再', '已', '曾', '将', '才', '刚', '正', '地', '得', '过',
    '来', '去', '上', '下', '里', '外', '前', '后', '中', '间', '时', '候',
    '什么', '怎么', '如何', '哪', '哪里', '哪儿', '谁', '几', '多少',
    '呢', '吗', '吧', '啊', '呀', '哦', '噢', '嗯', '哼', '唉', '哎',
    '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万',
    '个', '只', '些', '每', '某', '各', '另', '其', '此', '彼',
]);

/**
 * 分词并统计词频
 */
function tokenizeAndCount(text) {
    const wordCount = new Map();
    
    if (!text || typeof text !== 'string') return wordCount;
    
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`[^`]+`/g, '');
    text = text.replace(/\*\*[^*]+\*\*/g, '');
    text = text.replace(/\*[^*]+\*/g, '');
    text = text.replace(/https?:\/\/[^\s]+/g, '');
    text = text.replace(/<[^>]+>/g, '');
    
    const englishWords = text.toLowerCase().match(/[a-z]{2,}/g) || [];
    for (const word of englishWords) {
        if (!STOP_WORDS.has(word) && word.length >= 2) {
            wordCount.set(word, (wordCount.get(word) || 0) + 1);
        }
    }
    
    const chineseText = text.match(/[\u4e00-\u9fa5]+/g) || [];
    for (const segment of chineseText) {
        for (let len = 2; len <= Math.min(4, segment.length); len++) {
            for (let i = 0; i <= segment.length - len; i++) {
                const word = segment.substring(i, i + len);
                if (!STOP_WORDS.has(word)) {
                    wordCount.set(word, (wordCount.get(word) || 0) + 1);
                }
            }
        }
    }
    
    return wordCount;
}

/**
 * 生成年度统计数据
 */
async function generateAnnualSummary(userDataPath, year) {
    const cacheKey = `${userDataPath}_${year}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    
    const { start: yearStart, end: yearEnd } = getYearRange(year);
    
    const stats = {
        year,
        generatedAt: new Date().toISOString(),
        totalSessions: 0,
        totalMessages: 0,
        userMessages: 0,
        aiMessages: 0,
        totalTokens: 0,
        characterStats: new Map(),
        hourlyStats: Array(24).fill(0),
        weekdayStats: Array(7).fill(0),
        monthlyStats: Array(12).fill(0),
        dailyStats: new Map(),
        userWordFrequency: new Map(),
        totalUserWordCount: 0,
        totalAiWordCount: 0,
        userMessageLengths: [],
        firstChat: null,
        longestMessage: { length: 0, content: '', date: null },
        peakDay: { date: null, count: 0 },
        longestStreak: 0,
    };
    
    const activeChats = await getActiveChats(userDataPath);
    const activeGroupChats = await getActiveGroupChats(userDataPath);
    
    console.log(`[Annual Summary] Found ${activeChats.length} character chats and ${activeGroupChats.length} group chats to analyze`);
    
    // 处理角色聊天
    for (const { characterName, chatFile } of activeChats) {
        const { metadata, messages } = await readChatFile(chatFile);
        
        if (messages.length === 0) continue;
        
        let sessionHasYearMessages = false;
        
        for (const msg of messages) {
            const msgDate = parseTimestamp(msg.send_date || msg.gen_finished || msg.gen_started);
            
            if (!msgDate || msgDate < yearStart || msgDate > yearEnd) {
                continue;
            }
            
            sessionHasYearMessages = true;
            stats.totalMessages++;
            
            const isUser = msg.is_user === true;
            const messageContent = msg.mes || '';
            const messageLength = messageContent.length;
            
            if (isUser) {
                stats.userMessages++;
                stats.userMessageLengths.push(messageLength);
                
                const wordCounts = tokenizeAndCount(messageContent);
                for (const [word, count] of wordCounts) {
                    stats.userWordFrequency.set(word, 
                        (stats.userWordFrequency.get(word) || 0) + count);
                }
                
                stats.totalUserWordCount += messageContent.replace(/\s+/g, '').length;
                
                if (messageLength > stats.longestMessage.length) {
                    stats.longestMessage = {
                        length: messageLength,
                        content: messageContent.substring(0, 500),
                        date: msgDate.toISOString()
                    };
                }
            } else {
                stats.aiMessages++;
                stats.totalAiWordCount += messageContent.replace(/\s+/g, '').length;
            }
            
            if (msg.extra?.token_count) {
                stats.totalTokens += msg.extra.token_count;
            }
            
            stats.hourlyStats[msgDate.getHours()]++;
            stats.weekdayStats[msgDate.getDay()]++;
            stats.monthlyStats[msgDate.getMonth()]++;
            
            const dateKey = msgDate.toISOString().split('T')[0];
            stats.dailyStats.set(dateKey, (stats.dailyStats.get(dateKey) || 0) + 1);
            
            if (!stats.characterStats.has(characterName)) {
                stats.characterStats.set(characterName, {
                    name: characterName,
                    messageCount: 0,
                    userMessageCount: 0,
                    aiMessageCount: 0,
                    sessionCount: 0,
                    firstChatDate: null,
                    lastChatDate: null,
                    totalTurns: 0,
                });
            }
            
            const charStat = stats.characterStats.get(characterName);
            charStat.messageCount++;
            if (isUser) {
                charStat.userMessageCount++;
            } else {
                charStat.aiMessageCount++;
            }
            
            if (!charStat.firstChatDate || msgDate < new Date(charStat.firstChatDate)) {
                charStat.firstChatDate = msgDate.toISOString();
            }
            if (!charStat.lastChatDate || msgDate > new Date(charStat.lastChatDate)) {
                charStat.lastChatDate = msgDate.toISOString();
            }
            
            if (!stats.firstChat || msgDate < new Date(stats.firstChat.date)) {
                stats.firstChat = {
                    character: characterName,
                    date: msgDate.toISOString(),
                    message: messageContent.substring(0, 200)
                };
            }
        }
        
        if (sessionHasYearMessages) {
            stats.totalSessions++;
            const charStat = stats.characterStats.get(characterName);
            if (charStat) {
                charStat.sessionCount++;
            }
        }
    }
    
    // 处理群组聊天
    for (const { groupName, chatFile } of activeGroupChats) {
        const { metadata, messages } = await readChatFile(chatFile);
        
        if (messages.length === 0) continue;
        
        let sessionHasYearMessages = false;
        const characterName = `[群组] ${groupName}`;
        
        for (const msg of messages) {
            const msgDate = parseTimestamp(msg.send_date || msg.gen_finished || msg.gen_started);
            
            if (!msgDate || msgDate < yearStart || msgDate > yearEnd) {
                continue;
            }
            
            sessionHasYearMessages = true;
            stats.totalMessages++;
            
            const isUser = msg.is_user === true;
            const messageContent = msg.mes || '';
            const messageLength = messageContent.length;
            
            if (isUser) {
                stats.userMessages++;
                stats.userMessageLengths.push(messageLength);
                
                const wordCounts = tokenizeAndCount(messageContent);
                for (const [word, count] of wordCounts) {
                    stats.userWordFrequency.set(word,
                        (stats.userWordFrequency.get(word) || 0) + count);
                }
                
                stats.totalUserWordCount += messageContent.replace(/\s+/g, '').length;
                
                if (messageLength > stats.longestMessage.length) {
                    stats.longestMessage = {
                        length: messageLength,
                        content: messageContent.substring(0, 500),
                        date: msgDate.toISOString()
                    };
                }
            } else {
                stats.aiMessages++;
                stats.totalAiWordCount += messageContent.replace(/\s+/g, '').length;
            }
            
            if (msg.extra?.token_count) {
                stats.totalTokens += msg.extra.token_count;
            }
            
            stats.hourlyStats[msgDate.getHours()]++;
            stats.weekdayStats[msgDate.getDay()]++;
            stats.monthlyStats[msgDate.getMonth()]++;
            
            const dateKey = msgDate.toISOString().split('T')[0];
            stats.dailyStats.set(dateKey, (stats.dailyStats.get(dateKey) || 0) + 1);
            
            if (!stats.characterStats.has(characterName)) {
                stats.characterStats.set(characterName, {
                    name: characterName,
                    messageCount: 0,
                    userMessageCount: 0,
                    aiMessageCount: 0,
                    sessionCount: 0,
                    firstChatDate: null,
                    lastChatDate: null,
                    totalTurns: 0,
                });
            }
            
            const charStat = stats.characterStats.get(characterName);
            charStat.messageCount++;
            if (isUser) {
                charStat.userMessageCount++;
            } else {
                charStat.aiMessageCount++;
            }
            
            if (!charStat.firstChatDate || msgDate < new Date(charStat.firstChatDate)) {
                charStat.firstChatDate = msgDate.toISOString();
            }
            if (!charStat.lastChatDate || msgDate > new Date(charStat.lastChatDate)) {
                charStat.lastChatDate = msgDate.toISOString();
            }
            
            if (!stats.firstChat || msgDate < new Date(stats.firstChat.date)) {
                stats.firstChat = {
                    character: characterName,
                    date: msgDate.toISOString(),
                    message: messageContent.substring(0, 200)
                };
            }
        }
        
        if (sessionHasYearMessages) {
            stats.totalSessions++;
            const charStat = stats.characterStats.get(characterName);
            if (charStat) {
                charStat.sessionCount++;
            }
        }
    }
    
    // 计算峰值日
    for (const [date, count] of stats.dailyStats) {
        if (count > stats.peakDay.count) {
            stats.peakDay = { date, count };
        }
    }
    
    // 计算连续活跃天数
    const sortedDates = Array.from(stats.dailyStats.keys()).sort();
    let currentStreak = 1;
    let maxStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (diffDays === 1) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
    }
    stats.longestStreak = maxStreak;
    
    // 计算角色对话轮数
    for (const charStat of stats.characterStats.values()) {
        if (charStat.sessionCount > 0) {
            charStat.averageTurnsPerSession = Math.round(
                charStat.messageCount / charStat.sessionCount
            );
        }
    }
    
    // 转换为可序列化的格式
    const result = {
        year: stats.year,
        generatedAt: stats.generatedAt,
        totalSessions: stats.totalSessions,
        totalMessages: stats.totalMessages,
        userMessages: stats.userMessages,
        aiMessages: stats.aiMessages,
        totalTokens: stats.totalTokens,
        hourlyStats: stats.hourlyStats,
        weekdayStats: stats.weekdayStats,
        monthlyStats: stats.monthlyStats,
        totalUserWordCount: stats.totalUserWordCount,
        totalAiWordCount: stats.totalAiWordCount,
        firstChat: stats.firstChat,
        longestMessage: stats.longestMessage,
        peakDay: stats.peakDay,
        longestStreak: stats.longestStreak,
        characterStats: Array.from(stats.characterStats.values())
            .sort((a, b) => b.messageCount - a.messageCount),
        userWordFrequency: Array.from(stats.userWordFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 200)
            .map(([word, count]) => ({ word, count })),
        dailyStats: Array.from(stats.dailyStats.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date)),
        averageMessageLength: stats.userMessageLengths.length > 0 
            ? Math.round(stats.userMessageLengths.reduce((a, b) => a + b, 0) / stats.userMessageLengths.length)
            : 0,
        activeDays: stats.dailyStats.size,
    };
    
    // 缓存结果
    cache.set(cacheKey, {
        timestamp: Date.now(),
        data: result
    });
    
    return result;
}

/**
 * 插件初始化
 */
export async function init(router) {
    console.log('[Annual Summary] Plugin initializing...');
    
    // 获取年度总结API
    router.post('/generate', async (req, res) => {
        try {
            const year = parseInt(req.body.year) || new Date().getFullYear();
            const userDataPath = req.user?.directories?.root;
            
            if (!userDataPath) {
                return res.status(400).json({ 
                    error: 'User data path not found' 
                });
            }
            
            console.log(`[Annual Summary] Generating summary for year ${year}`);
            const summary = await generateAnnualSummary(userDataPath, year);
            
            res.json(summary);
        } catch (error) {
            console.error('[Annual Summary] Error generating summary:', error);
            res.status(500).json({ 
                error: 'Failed to generate annual summary',
                message: error.message 
            });
        }
    });
    
    // 清除缓存API
    router.post('/clear-cache', (req, res) => {
        cache.clear();
        res.json({ success: true, message: 'Cache cleared' });
    });
    
    // 健康检查
    router.get('/health', (req, res) => {
        res.json({ 
            status: 'ok', 
            plugin: info.name,
            version: '1.0.0'
        });
    });
    
    console.log('[Annual Summary] Plugin initialized successfully');
}