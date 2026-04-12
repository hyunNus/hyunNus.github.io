/**
 * fetch-notion.js
 * Notion API에서 TIL/Books 데이터를 가져와 /data/*.json으로 저장
 * 
 * 환경변수:
 *   NOTION_TOKEN       - Notion Integration Token
 *   NOTION_TIL_DB_ID   - TIL 데이터베이스 ID
 *   NOTION_BOOKS_DB_ID - Books 데이터베이스 ID
 */

import { Client } from '@notionhq/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

// 데이터 디렉토리 생성
mkdirSync(DATA_DIR, { recursive: true });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const TIL_DB_ID   = process.env.NOTION_TIL_DB_ID;
const BOOKS_DB_ID = process.env.NOTION_BOOKS_DB_ID;

// ─── 헬퍼 함수 ───────────────────────────────────────────────
function getRichText(prop) {
  if (!prop || !prop.rich_text) return '';
  return prop.rich_text.map(t => t.plain_text).join('');
}

function getTitle(prop) {
  if (!prop || !prop.title) return '';
  return prop.title.map(t => t.plain_text).join('');
}

function getSelect(prop) {
  if (!prop || !prop.select) return null;
  return prop.select.name;
}

function getMultiSelect(prop) {
  if (!prop || !prop.multi_select) return [];
  return prop.multi_select.map(s => s.name);
}

function getDate(prop) {
  if (!prop || !prop.date) return null;
  return prop.date.start;
}

function getNumber(prop) {
  if (!prop || prop.number === null || prop.number === undefined) return null;
  return prop.number;
}

function getCheckbox(prop) {
  if (!prop) return false;
  return prop.checkbox === true;
}

// 노션 페이지 블록 → 마크다운 변환 (간단 버전)
async function pageToMarkdown(pageId) {
  try {
    const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
    let md = '';
    for (const block of blocks.results) {
      switch (block.type) {
        case 'paragraph':
          md += block.paragraph.rich_text.map(t => t.plain_text).join('') + '\n\n';
          break;
        case 'heading_1':
          md += '# ' + block.heading_1.rich_text.map(t => t.plain_text).join('') + '\n\n';
          break;
        case 'heading_2':
          md += '## ' + block.heading_2.rich_text.map(t => t.plain_text).join('') + '\n\n';
          break;
        case 'heading_3':
          md += '### ' + block.heading_3.rich_text.map(t => t.plain_text).join('') + '\n\n';
          break;
        case 'bulleted_list_item':
          md += '- ' + block.bulleted_list_item.rich_text.map(t => t.plain_text).join('') + '\n';
          break;
        case 'numbered_list_item':
          md += '1. ' + block.numbered_list_item.rich_text.map(t => t.plain_text).join('') + '\n';
          break;
        case 'code':
          const lang = block.code.language || '';
          const code = block.code.rich_text.map(t => t.plain_text).join('');
          md += '```' + lang + '\n' + code + '\n```\n\n';
          break;
        case 'quote':
          md += '> ' + block.quote.rich_text.map(t => t.plain_text).join('') + '\n\n';
          break;
        case 'divider':
          md += '---\n\n';
          break;
        default:
          break;
      }
    }
    return md.trim();
  } catch (e) {
    return '';
  }
}

// ─── TIL 데이터 fetch ─────────────────────────────────────────
async function fetchTIL() {
  console.log('📚 TIL 데이터 가져오는 중...');
  
  const response = await notion.databases.query({
    database_id: TIL_DB_ID,
    filter: {
      property: 'Published',
      checkbox: { equals: true }
    },
    sorts: [{ property: 'Date', direction: 'descending' }]
  });

  const items = [];
  for (const page of response.results) {
    const p = page.properties;
    const content = await pageToMarkdown(page.id);
    
    items.push({
      id: page.id,
      title: getTitle(p['Name']),
      category: getSelect(p['Category']),
      tags: getMultiSelect(p['Tags']),
      date: getDate(p['Date']),
      summary: getRichText(p['Summary']),
      content: content,
      url: page.url,
      created: page.created_time,
      updated: page.last_edited_time
    });
  }

  const output = {
    lastSync: new Date().toISOString(),
    count: items.length,
    items
  };

  writeFileSync(join(DATA_DIR, 'til.json'), JSON.stringify(output, null, 2));
  console.log(`✅ TIL ${items.length}개 저장 완료`);
  return items.length;
}

// ─── Books 데이터 fetch ───────────────────────────────────────
async function fetchBooks() {
  console.log('📖 Books 데이터 가져오는 중...');
  
  const response = await notion.databases.query({
    database_id: BOOKS_DB_ID,
    filter: {
      property: 'Published',
      checkbox: { equals: true }
    },
    sorts: [{ property: 'Status', direction: 'ascending' }]
  });

  const items = [];
  for (const page of response.results) {
    const p = page.properties;
    
    items.push({
      id: page.id,
      title: getTitle(p['Name']),
      author: getRichText(p['Author']),
      genre: getSelect(p['Genre']),
      status: getSelect(p['Status']),
      rating: getNumber(p['Rating']),
      pages: getNumber(p['Pages']),
      review: getRichText(p['Review']),
      url: page.url,
      created: page.created_time,
      updated: page.last_edited_time
    });
  }

  const output = {
    lastSync: new Date().toISOString(),
    count: items.length,
    items
  };

  writeFileSync(join(DATA_DIR, 'books.json'), JSON.stringify(output, null, 2));
  console.log(`✅ Books ${items.length}개 저장 완료`);
  return items.length;
}

// ─── 메타 데이터 저장 ─────────────────────────────────────────
function saveMetadata(tilCount, booksCount) {
  const meta = {
    lastSync: new Date().toISOString(),
    tilCount,
    booksCount
  };
  writeFileSync(join(DATA_DIR, 'meta.json'), JSON.stringify(meta, null, 2));
}

// ─── 메인 실행 ────────────────────────────────────────────────
async function main() {
  console.log('🌾 SRE Notion Sync 시작...\n');
  
  if (!process.env.NOTION_TOKEN) {
    console.error('❌ NOTION_TOKEN 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  try {
    const tilCount   = TIL_DB_ID   ? await fetchTIL()   : 0;
    const booksCount = BOOKS_DB_ID ? await fetchBooks() : 0;
    saveMetadata(tilCount, booksCount);
    console.log('\n🎉 동기화 완료!');
  } catch (error) {
    console.error('❌ 동기화 실패:', error.message);
    // 빈 데이터 파일 생성 (사이트가 깨지지 않도록)
    const empty = { lastSync: new Date().toISOString(), count: 0, items: [] };
    writeFileSync(join(DATA_DIR, 'til.json'),   JSON.stringify(empty, null, 2));
    writeFileSync(join(DATA_DIR, 'books.json'), JSON.stringify(empty, null, 2));
    saveMetadata(0, 0);
    process.exit(1);
  }
}

main();
