
import fs from 'fs';
const report = JSON.parse(fs.readFileSync('lighthouse-report-optimized.json', 'utf8'));

console.log('--- OPTIMIZED LIVE Lighthouse Scores ---');
console.log(`Performance: ${report.categories.performance.score * 100}`);
console.log(`Accessibility: ${report.categories.accessibility.score * 100}`);
console.log(`Best Practices: ${report.categories['best-practices'].score * 100}`);
console.log(`SEO: ${report.categories.seo.score * 100}`);

console.log('\n--- Core Web Vitals ---');
console.log(`FCP: ${report.audits['first-contentful-paint'].displayValue}`);
console.log(`LCP: ${report.audits['largest-contentful-paint'].displayValue}`);
console.log(`TBT: ${report.audits['total-blocking-time'].displayValue}`);
console.log(`CLS: ${report.audits['cumulative-layout-shift'].displayValue}`);
console.log(`Speed Index: ${report.audits['speed-index'].displayValue}`);
