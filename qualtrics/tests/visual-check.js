// Visual + accessibility check of the survey theme on the live Qualtrics page.
// Usage: node visual-check.js <survey-url> <path/to/survey-theme.css | none> <output-dir>
// Needs: npm i playwright axe-core (Chromium already installed).
// Injects the CSS into the rendered page, clicks a few answers (nothing is submitted),
// takes full-page screenshots at 1280 / 390 / 320 px and runs axe (WCAG 2.2 AA tags).
// The selectors below target the QIDs of the current test survey: update them if QIDs change.
const { chromium } = require('playwright'); const fs=require('fs');
const [URL, CSS, OUT] = process.argv.slice(2);
const css = CSS==='none' ? null : fs.readFileSync(CSS,'utf8');
const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
(async () => {
  const b = await chromium.launch();
  for (const [name, opts] of [['desktop',{viewport:{width:1280,height:900}}],['mobile',{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}],['mobile320',{viewport:{width:320,height:700},isMobile:true,hasTouch:true}]]) {
    const p = await (await b.newContext(opts)).newPage();
    await p.goto(URL,{waitUntil:'networkidle'}); await p.waitForTimeout(1500);
    if (css) await p.addStyleTag({content: css});
    await p.waitForTimeout(300);
    // interactions
    await p.click('#question-QID1 label[for="choice-QID1-7"]');
    await p.click('#question-QID2 label[for="mc-choice-input-QID2-2"]');
    await p.click('#question-QID11 label[for="choice-QID11-1-4"]');
    await p.focus('#slider-statement-QID6-2 input[type=range]'); for (let i=0;i<5;i++) await p.keyboard.press('ArrowRight');
    await p.fill('#question-QID10 .choice-outer:nth-of-type(2) input', '40').catch(()=>{});
    await p.focus('#choice-QID1-7'); // focus ring on NPS
    await p.waitForTimeout(300);
    await p.screenshot({path:`${OUT}/${name}.png`, fullPage:true});
    const m = await p.evaluate(()=>{
      const r=s=>{const e=document.querySelector(s); if(!e) return null; const b=e.getBoundingClientRect(); return [Math.round(b.width),Math.round(b.height)]};
      return { hscroll: document.documentElement.scrollWidth > innerWidth, scrollW: document.documentElement.scrollWidth,
        nps: r('#choice-display-QID1-0'), ns: r('#choice-display-QID11-1-0'), mc: r('#question-QID2 .choice-label'), next: r('#next-button'),
        npsSelectedState: document.querySelector('#choice-display-QID1-7').parentElement.className,
        npsInputChecked: document.querySelector('#choice-QID1-7').checked, mcChecked: document.querySelector('#mc-choice-input-QID2-2').checked,
        nsChecked: document.querySelector('#choice-QID11-1-4').checked,
        slider2: document.querySelector('#slider-statement-QID6-2').className + ' val=' + document.querySelector('#slider-statement-QID6-2 input').value };
    });
    await p.addScriptTag({content: axe});
    const res = await p.evaluate(async()=>{const r=await axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}); return r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,t:v.nodes.slice(0,3).map(n=>n.target.join(' '))}))});
    console.log(name, JSON.stringify(m), '\n axe:', JSON.stringify(res));
  }
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
