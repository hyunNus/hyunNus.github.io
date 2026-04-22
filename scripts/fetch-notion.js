/**
 * fetch-notion.js
 * Notion API에서 TIL/Books 데이터를 가져와 /data/*.json으로 저장
 */

import { Client } from '@notionhq/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

mkdirSync(DATA_DIR, { recursive: true });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const TIL_DB_ID   = process.env.NOTION_TIL_DB_ID;
const BOOKS_DB_ID = process.env.NOTION_BOOKS_DB_ID;

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

function richTextToMarkdown(richTextArray) {
  if (!richTextArray) return '';
  return richTextArray.map(t => {
    let text = t.plain_text;
    if (t.annotations.bold) text = `**${text}**`;
    if (t.annotations.italic) text = `*${text}*`;
    if (t.annotations.strikethrough) text = `~~${text}~~`;
    if (t.annotations.code) text = `\`${text}\``;
    if (t.href) text = `[${text}](${t.href})`;
    return text;
  }).join('');
}

async function pageToMarkdown(pageId) {
  try {
    const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
    let md = '';
    for (const block of blocks.results) {
      switch (block.type) {
        case 'paragraph':
          md += richTextToMarkdown(block.paragraph.rich_text) + '\n\n';
          break;
        case 'heading_1':
          md += '# ' + richTextToMarkdown(block.heading_1.rich_text) + '\n\n';
          break;
        case 'heading_2':
          md += '## ' + richTextToMarkdown(block.heading_2.rich_text) + '\n\n';
          break;
        case 'heading_3':
          md += '### ' + richTextToMarkdown(block.heading_3.rich_text) + '\n\n';
          break;
        case 'bulleted_list_item':
          md += '- ' + richTextToMarkdown(block.bulleted_list_item.rich_text) + '\n';
          break;
        case 'numbered_list_item':
          md += '1. ' + richTextToMarkdown(block.numbered_list_item.rich_text) + '\n';
          break;
        case 'code':
          const lang = block.code.language || '';
          const code = block.code.rich_text.map(t => t.plain_text).join('');
          md += '```' + lang + '\n' + code + '\n```\n\n';
          break;
        case 'quote':
          md += '> ' + richTextToMarkdown(block.quote.rich_text) + '\n\n';
          break;
        case 'divider':
          md += '---\n\n';
          break;
        case 'bookmark':
          const url = block.bookmark.url;
          const caption = richTextToMarkdown(block.bookmark.caption);
          md += `\n> 🔗 **Bookmark**: [${caption || url}](${url})\n\n`;
          break;
        case 'link_preview':
          md += `\n> 🔗 **Link**: [${block.link_preview.url}](${block.link_preview.url})\n\n`;
          break;
        case 'image':
          const imgUrl = block.image.type === 'external' ? block.image.external.url : block.image.file.url;
          const imgCaption = richTextToMarkdown(block.image.caption);
          md += `![${imgCaption || 'image'}](${imgUrl})\n\n`;
          break;
        case 'callout':
          const icon = block.callout.icon?.emoji || '💡';
          const calloutText = richTextToMarkdown(block.callout.rich_text);
          md += `\n> ${icon} ${calloutText}\n\n`;
          break;
        case 'to_do':
          const checked = block.to_do.checked ? '[x]' : '[ ]';
          md += `${checked} ${richTextToMarkdown(block.to_do.rich_text)}\n`;
          break;
      }
    }
    return md.trim();
  } catch (e) {
    return '';
  }
}

async function fetchTIL() {
  const response = await notion.databases.query({
    database_id: TIL_DB_ID,
    filter: { property: 'Published', checkbox: { equals: true } },
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
  writeFileSync(join(DATA_DIR, 'til.json'), JSON.stringify({ lastSync: new Date().toISOString(), count: items.length, items }, null, 2));
  return items.length;
}

async function fetchBooks() {
  const response = await notion.databases.query({
    database_id: BOOKS_DB_ID,
    filter: { property: 'Published', checkbox: { equals: true } },
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
  writeFileSync(join(DATA_DIR, 'books.json'), JSON.stringify({ lastSync: new Date().toISOString(), count: items.length, items }, null, 2));
  return items.length;
}

async function main() {
  if (!process.env.NOTION_TOKEN) process.exit(1);
  try {
    const tilCount = TIL_DB_ID ? await fetchTIL() : 0;
    const booksCount = BOOKS_DB_ID ? await fetchBooks() : 0;
    writeFileSync(join(DATA_DIR, 'meta.json'), JSON.stringify({ lastSync: new Date().toISOString(), tilCount, booksCount }, null, 2));
  } catch (error) {
    process.exit(1);
  }
}
main();
