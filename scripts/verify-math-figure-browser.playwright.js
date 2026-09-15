// Run with Playwright MCP browser_run_code_unsafe(filename: this file).
// Uses local dev sample login. Only the AI analysis response is mocked; all editing/export UI is real.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- MCP evaluates this function expression, not a Node module.
async (page) => {
  const results = [];
  const check = (condition, name) => { if (!condition) throw new Error(name); results.push(name); };
  await page.goto("http://localhost:3000/admin/math-figures");
  if (page.url().includes("/login")) {
    await page.getByRole("button", {name:"관리자 샘플 로그인",exact:true}).click();
    await page.waitForURL(/admin/);
    await page.goto("http://localhost:3000/admin/math-figures");
  }
  await page.getByRole("tab", {name:"수식·수치로 생성",exact:true}).click();
  const apply = () => page.getByRole("button", {name:"계산해서 편집기에 적용",exact:true}).click();
  const picture = () => page.locator("[data-figure-content]").innerHTML();
  await page.getByLabel("함수식 (한 줄에 하나, 최대 2개)").fill("x^2");
  await apply();
  const quadratic = await picture();
  await page.getByLabel("함수식 (한 줄에 하나, 최대 2개)").fill("2x+1");
  await apply(); check(quadratic !== await picture(),"function expression updates geometry");
  await page.getByRole("button",{name:"취소",exact:true}).click();
  check(quadratic === await picture(),"undo restores geometry");
  await page.getByLabel("함수식 (한 줄에 하나, 최대 2개)").fill("unknown(x)");
  await apply(); check(quadratic === await picture(),"unsupported function does not mutate geometry");
  for (const [kind,field,value] of [["cuboid","높이","8"],["cylinder","반지름","4"],["cone","높이","9"],["sphereSection","단면 높이","3"],["normal","표준편차 σ","2"],["binomial","확률 p","0.7"]]) {
    await page.getByRole("combobox",{name:"계산 유형"}).selectOption(kind);
    await apply(); const before = await picture();
    await page.getByLabel(field,{exact:true}).fill(value);
    await apply(); check(before !== await picture(),`${kind} parameter updates geometry`);
  }
  const validProbability = await picture();
  await page.getByLabel("확률 p",{exact:true}).fill("2");
  await apply(); check(validProbability === await picture(),"invalid probability rejected");
  const paint = {color:"#000000",dashed:false};
  const fixture = {title:"조건 검증 도형",description:"Browser test",projection:"plane",xRange:[-4,6],yRange:[-2,6],notes:[],shapes:[
    {type:"line",...paint,from:[0,0],to:[4,0],arrow:false},
    {type:"line",...paint,from:[1,2],to:[3,3],arrow:false},
    {type:"circle",...paint,center:[-2,2],radius:1,fill:"none"},
    {type:"point",...paint,at:[-1,3],label:"P",filled:true,fontSize:22},
    {type:"text",...paint,at:[3,4.5],text:"\\sqrt{3}",fontSize:24,autoPosition:false},
  ]};
  await page.route("**/api/admin/math-figures/analyze",route => route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({spec:fixture})}));
  try {
    await page.getByRole("tab",{name:"이미지에서 복원",exact:true}).click();
    const pixel = await page.screenshot({type:"png",clip:{x:0,y:0,width:1,height:1}});
    await page.locator('input[type="file"]').setInputFiles({name:"fixture.png",mimeType:"image/png",buffer:pixel});
    await page.getByRole("button",{name:"벡터 도형으로 복원",exact:true}).click();
    await page.getByRole("heading",{name:fixture.title,exact:true}).waitFor();
    await page.getByText("수학적 조건 유지",{exact:true}).click();
    const add = async (kind,target,reference) => {
      await page.getByRole("combobox",{name:"조건",exact:true}).selectOption(kind);
      await page.getByRole("combobox",{name:"움직일 대상",exact:true}).selectOption(target);
      await page.getByRole("combobox",{name:"기준 요소",exact:true}).selectOption(reference);
      await page.getByRole("button",{name:"조건 추가",exact:true}).click();
    };
    const geometry = () => page.locator("[data-figure-content]").evaluate(el => ({
      lines:[...el.querySelectorAll("line:not([data-editor-hit]):not([data-editor-selection])")].map(n => ["x1","y1","x2","y2"].map(k => Number(n.getAttribute(k)))),
      circles:[...el.querySelectorAll("circle:not([data-editor-hit]):not([data-editor-selection])")].map(n => ["cx","cy","r"].map(k => Number(n.getAttribute(k)))),
    }));
    await add("parallel","1","0");
    const parallel = (await geometry()).lines[1]; check(Math.abs(parallel[1]-parallel[3])<.01,"parallel constraint");
    const beforeConflict = await picture(); await add("perpendicular","1","0");
    check(beforeConflict === await picture(),"conflicting constraints rejected");
    await page.getByRole("button",{name:"해제",exact:true}).click();
    await add("onCircle","3","2"); await add("tangent","1","2");
    const circle = page.getByRole("button",{name:"원 선택",exact:true});
    const bounds = await circle.boundingBox(); await circle.click({position:{x:1,y:bounds.height/2}});
    const radius = page.getByRole("group",{name:"크기 조정",exact:true}).getByRole("spinbutton");
    await radius.fill("2"); await radius.press("Tab");
    const g = await geometry(), [cx,cy,r] = g.circles[0], [px,py] = g.circles[1], [x1,y1,x2,y2] = g.lines[1];
    check(Math.abs(r-94)<.01,"radius updated");
    check(Math.abs(Math.hypot(px-cx,py-cy)-r)<.01,"point remains on resized circle");
    check(Math.abs(Math.hypot(x1-cx,y1-cy)-r)<.01 && Math.abs((x1-cx)*(x2-x1)+(y1-cy)*(y2-y1))<.01,"tangent remains tangent after resize");
    for (const extension of ["PNG","SVG"]) {
      const pending = page.waitForEvent("download");
      await page.getByRole("button",{name:extension,exact:true}).click(); const download = await pending;
      check(await download.failure() === null && download.suggestedFilename() === `${fixture.title}.${extension.toLowerCase()}`,`${extension} download with figure title`);
    }
    await page.setViewportSize({width:390,height:844});
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),"mobile has no horizontal overflow");
  } finally {
    await page.unroute("**/api/admin/math-figures/analyze");
    await page.setViewportSize({width:1440,height:1000});
  }
  return {passed:results.length,checks:results,aiResponseMocked:true,browser:await page.evaluate(() => navigator.userAgent)};
}
