const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/album-preview-Cl0Xg5rP.js","assets/modulepreload-polyfill-B5Qt9EMX.js"])))=>i.map(i=>d[i]);
import"./modulepreload-polyfill-B5Qt9EMX.js";let ze=class{constructor(){this.listeners=new Set,this.history=[],this.historyIndex=-1,this.maxHistory=50,this._isBatchUpdating=!1;const e=this.getInitialState();this._target=e,this.state=new Proxy(e,{get:(t,o)=>t[o],set:(t,o,s)=>(t[o]=s,this._isBatchUpdating||this.notify(o,s),!0)})}getInitialState(){return{activePageId:null,pages:[],assets:{photos:[],designs:[],backgrounds:[],frames:[],textStyles:[]},selection:null,theme:"classic",cover:{layout:"standard",title:"My Photo Book",subtitle:"2025",spineText:"My Photo Book",frontPhotoId:null,backPhotoId:null,theme:"classic",textColor:"#000000"},viewMode:"pages"}}reset(){const e=this.getInitialState();Object.keys(this.state).forEach(t=>{t!=="user"&&delete this.state[t]}),this._isBatchUpdating=!0,Object.assign(this.state,e),this._isBatchUpdating=!1,this.history=[],this.historyIndex=-1,console.log("[Store] State reset to initial."),this.notify("reset",null)}pushState(e="Unknown Action"){const t=Date.now();if(this._lastPushAction===e&&t-(this._lastPushTime||0)<300)return;this._lastPushAction=e,this._lastPushTime=t,this.historyIndex<this.history.length-1&&(this.history=this.history.slice(0,this.historyIndex+1));let o;try{const s=n=>{try{return structuredClone(n)}catch{}return JSON.parse(JSON.stringify(n))};if(o={pages:s(this.state.pages||[]),cover:s(this.state.cover||{}),theme:this.state.theme},o.pages){for(const n of o.pages)if(n.photos&&Array.isArray(n.photos))for(const r of n.photos)r&&r.url&&r.url.startsWith("data:")&&(r.url=r.url.substring(0,100)+"...[base64]")}}catch{return}this.history.push({name:e,timestamp:t,snapshot:o}),this.history.length>this.maxHistory?this.history.shift():this.historyIndex++}undo(){this.historyIndex>0?(this.historyIndex--,this.restoreState(this.history[this.historyIndex]),console.log(`[Store] Undid to state index ${this.historyIndex}`)):console.warn("[Store] Nothing to undo")}redo(){this.historyIndex<this.history.length-1?(this.historyIndex++,this.restoreState(this.history[this.historyIndex]),console.log(`[Store] Redid to state index ${this.historyIndex}`)):console.warn("[Store] Nothing to redo")}restoreState(e){if(!e||!e.snapshot)return;const t=e.snapshot;this._isBatchUpdating=!0;const o=s=>{if(typeof structuredClone=="function")try{return structuredClone(s)}catch{}return JSON.parse(JSON.stringify(s))};t.pages&&(this.state.pages=o(t.pages),!this.state.pages.find(s=>s.id===this.state.activePageId)&&this.state.pages.length>0&&(this.state.activePageId=this.state.pages[0].id)),t.cover&&(this.state.cover=o(t.cover)),t.assets&&(this.state.assets=o(t.assets)),t.theme&&(this.state.theme=t.theme),this._isBatchUpdating=!1,this.notify("history_restore",null)}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}notify(e,t){if(e==="pages"&&window._magicPages&&window._magicPages.length>1){const o=this._target.pages;!o||o.length<=1?this._target.pages=window._magicPages:o.length===1&&o[0]?.id&&!o[0].id.startsWith("page_")&&(this._target.pages=window._magicPages)}if(e==="cover"&&window._magicCover&&window._magicCover.background){const o=this._target.cover;o&&o.theme==="classic"&&o.background===void 0&&window._magicCover.theme!=="classic"&&(this._target.cover={...window._magicCover})}this.listeners.forEach(o=>o(this.state,e,t))}addPage(){const e={id:crypto.randomUUID(),layout:{id:"single",slots:[{x:10,y:10,width:80,height:80}]},elements:[],background:this.state.theme};this.state.pages=[...this.state.pages,e],this.state.activePageId=e.id}setTheme(e){this.state.theme=e,this.state.pages=this.state.pages.map(t=>({...t,background:e})),this.state.cover&&(this.state.cover.theme=e),this.notify("theme",e),this.notify("pages",this.state.pages),this.notify("cover",this.state.cover)}};const Be=new ze;window.store=Be;class Ue{constructor(){this.layouts={"1-landscape":{type:"grid",slots:[{x:10,y:10,w:80,h:60}]},"1-portrait":{type:"grid",slots:[{x:25,y:5,w:50,h:90}]},"1-full":{type:"grid",slots:[{x:0,y:0,w:100,h:100}]},"1-square":{type:"grid",slots:[{x:25,y:25,w:50,h:50}]},"2-landscape-stack":{type:"grid",slots:[{x:10,y:10,w:80,h:38},{x:10,y:52,w:80,h:38}]},"2-side-by-side":{type:"grid",slots:[{x:5,y:20,w:42.5,h:60},{x:52.5,y:20,w:42.5,h:60}]},"2-diagonal":{type:"grid",slots:[{x:5,y:5,w:55,h:55},{x:40,y:40,w:55,h:55}]},"3-hero-left":{type:"grid",slots:[{x:5,y:5,w:45,h:90},{x:55,y:5,w:40,h:42.5},{x:55,y:52.5,w:40,h:42.5}]},"3-grid-uniform":{type:"grid",slots:[{x:5,y:30,w:28,h:40},{x:36,y:30,w:28,h:40},{x:67,y:30,w:28,h:40}]},"3-stack-left":{type:"grid",slots:[{x:5,y:5,w:40,h:28},{x:5,y:36,w:40,h:28},{x:5,y:67,w:40,h:28}]},"3-row-stack":{type:"grid",slots:[{x:5,y:5,w:90,h:28},{x:5,y:36,w:90,h:28},{x:5,y:67,w:90,h:28}]},"4-grid":{type:"grid",slots:[{x:5,y:5,w:42.5,h:42.5},{x:52.5,y:5,w:42.5,h:42.5},{x:5,y:52.5,w:42.5,h:42.5},{x:52.5,y:52.5,w:42.5,h:42.5}]},"4-hero-center":{type:"grid",slots:[{x:25,y:15,w:50,h:70},{x:5,y:5,w:15,h:25},{x:80,y:5,w:15,h:25},{x:42.5,y:90,w:15,h:10}]},"5-collage":{type:"grid",slots:[{x:5,y:5,w:45,h:45},{x:50,y:5,w:45,h:45},{x:5,y:50,w:30,h:45},{x:35,y:50,w:30,h:45},{x:65,y:50,w:30,h:45}]}}}generateLayout(e){return e.length===0?null:this.getNextLayout(e,null)}getNextLayout(e,t){const o=e.length;if(o===0)return null;const s=Object.keys(this.layouts).filter(i=>i.startsWith(`${o}-`));o>1&&Object.keys(this.layouts).filter(i=>i.startsWith(`${o-1}-`)).forEach(i=>s.push(i)),Object.keys(this.layouts).filter(i=>i.startsWith(`${o+1}-`)).forEach(i=>s.push(i)),s.push(`dynamic-${o}`);let n=0;if(t){const i=s.indexOf(t);i>-1&&(n=(i+1)%s.length)}const r=s[n];return r&&r.startsWith("dynamic-")?this.generateDynamicGrid(e):this.createSlotsFromGrid(r,e)}createSlotsFromGrid(e,t){const o=this.layouts[e];if(!o)return null;const s=t.map((n,r)=>{const i=o.slots[r%o.slots.length],a={photoId:n.id,x:i.x,y:i.y,width:i.w,height:i.h};return n.shape&&(a.shape=n.shape),a});return{name:e,slots:s}}generateDynamicGrid(e){const t=e.length;let o=Math.ceil(Math.sqrt(t)),s=Math.ceil(t/o);t===4&&(o=2,s=2),t===5&&(o=3,s=2),o*s<t&&s++;const n=[],r=2,i=100-r*2,a=100-r*2,l=(i-r*(o-1))/o,c=(a-r*(s-1))/s;for(let d=0;d<t;d++){const p=d%o,u=Math.floor(d/o);let g=0;const m=t%o||o;u===s-1&&m<o&&(g=(o-m)*(l+r)/2);const w=e[d]?e[d].id:null;n.push({photoId:w,x:r+p*(l+r)+g,y:r+u*(c+r),width:l,height:c})}return{name:`dynamic-${t}`,slots:n}}}const Q=new Ue;class qe{constructor(){this.functions=null}getFunctions(){return!this.functions&&window.firebase&&(this.functions=firebase.functions()),this.functions}async getOptimalCrop(e,t,o,s){try{return console.log("[DEBUG] getOptimalCrop INITIATED with:",{photoUrl:e,photoWidth:t,photoHeight:o,layoutBox:s}),(await this.getFunctions().httpsCallable("analyzePhotoPosition")({photoUrl:e,width:t,height:o,layoutBox:s})).data}catch(n){return console.error("[PhotoPositionService] Error:",n),this.calculateCenterCrop({width:t,height:o},s)}}async batchAnalyzePhotos(e){try{if(!e||e.length===0)return{};console.log(`[PhotoPositionService] Batch analyzing ${e.length} photos...`);const t=50,o={};for(let s=0;s<e.length;s+=t){const n=e.slice(s,s+t),i=await this.getFunctions().httpsCallable("analyzeBatchPhotoPositions")({photos:n});i.data&&Object.assign(o,i.data)}return console.log("[PhotoPositionService] Batch analysis complete.",o),o}catch(t){return console.error("[PhotoPositionService] Batch Error:",t),{}}}calculateCenterCrop(e,t){const o=e.width/e.height,s=t.width/t.height;let n,r;return o>s?(r=e.height,n=Math.round(r*s)):(n=e.width,r=Math.round(n/s)),{crop:{x:Math.round((e.width-n)/2),y:Math.round((e.height-r)/2),width:n,height:r},fallback:!0}}}const Ie=new qe,Ne={apiKey:"AIzaSyCnrmoGSaebSk03F6dzAUOj5-3okolxwb0",authDomain:"shoso-photobook.firebaseapp.com",projectId:"shoso-photobook",storageBucket:"shoso-photobook.firebasestorage.app",messagingSenderId:"982613325804",appId:"1:982613325804:web:d778a62a1fc8107045f2c9",measurementId:"G-6B8BJBPY2V"};firebase.apps.length||(firebase.initializeApp(Ne),console.log("Firebase Initialized in AI Editor - FORCE PRODUCTION MODE"));const re=firebase.auth(),je=firebase.firestore(),Oe=firebase.storage(),He=firebase.functions(),J={async signInWithGoogle(){const P=new firebase.auth.GoogleAuthProvider;try{return(await re.signInWithPopup(P)).user}catch(e){throw console.error("Login Failed:",e),e}},async signOut(){try{await re.signOut()}catch(P){console.error("Logout Failed:",P)}},onAuthStateChanged(P){return re.onAuthStateChanged(P)},getCurrentUser(){return re.currentUser},getDB(){return je},getStorage(){return Oe},getFunctions(){return He}},me=Object.freeze(Object.defineProperty({__proto__:null,authService:J},Symbol.toStringTag,{value:"Module"}));class Ge{constructor(e){this.doc=null,this.templateConfig=e||{}}setTemplateConfig(e){this.templateConfig=e,console.log("PDF: Template Config updated",e?e.id:"null")}async generatePDF(e,t,o,s=!1){if(console.log("PDF: Starting generation..."),console.log("PDF: Template config present:",!!this.templateConfig,this.templateConfig?.id),!window.jspdf){console.error("PDF: jsPDF global not found!"),alert("ספריית PDF חסרה. אנא רענן את הדף.");return}const{jsPDF:n}=window.jspdf;console.log("PDF: jsPDF loaded. Creating doc..."),this.hebrewFontLoaded=!1;try{let r=900,i=600;this.templateConfig&&this.templateConfig.designSystem&&this.templateConfig.designSystem.canvas?(r=this.templateConfig.designSystem.canvas.width||r,i=this.templateConfig.designSystem.canvas.height||i):t&&t.layout;const a=r*.75,l=i*.75;console.log(`PDF: Using format [${a}, ${l}] (from ${r}x${i}px)`),this.doc=new n({orientation:r>i?"landscape":"portrait",unit:"pt",format:[a,l]}),this.pageWidth=a,this.pageHeight=l,console.log("PDF: Doc created."),await this.loadHebrewFont(),t&&(console.log("PDF: Rendering Front Cover..."),await this.renderFrontCover(t,o)),console.log(`PDF: Rendering ${e.length} content pages...`);for(let d=0;d<e.length;d++)this.doc.addPage([a,l]),console.log(`PDF: Rendering Page ${d+1}`),await this.renderPageToPDF(e[d],o);t&&(t.title||t.subtitle)&&(this.doc.addPage([a,l]),console.log("PDF: Rendering Spine..."),await this.renderSpine(t,o)),t&&t.backPhotoId&&(this.doc.addPage([a,l]),console.log("PDF: Rendering Back Cover..."),await this.renderBackCover(t,o)),console.log("PDF: Rendering complete. Saving...");const c=`photo-book-${new Date().toISOString().slice(0,10)}.pdf`;if(s){const d=this.doc.output("arraybuffer"),p=new Blob([d],{type:"application/pdf"});return console.log(`[PDF] Blob created for return. Size: ${p.size} bytes, Type: ${p.type}`),p}console.log(`[PDF] Triggering direct download: ${c}`),this.doc.save(c),console.log("PDF: Download triggered successfully."),this.showSuccessModal(c)}catch(r){console.error("PDF Export Error:",r),alert("ייצוא נכשל: "+r.message)}}async renderFrontCover(e,t){const o=this.doc.internal.pageSize.getWidth(),s=this.doc.internal.pageSize.getHeight();console.log(`[PDF] Rendering Front Cover - frontPhotoId: ${e.frontPhotoId}`),await this.drawBackground(e.color,e.theme,o,s),e.frontPhotoId&&(console.log(`[PDF] Drawing front cover photo (full page): ${e.frontPhotoId}`),await this.drawImage(e.frontPhotoId,0,0,o,s,t,{photoStyle:"default"}));const n=e.customLayout||this.templateConfig?.pageLayouts?.find(r=>r.pageType==="cover"||r.layoutId==="cover-elegant");if(n){if(n.textElements)for(const r of n.textElements){let i=r.content||r.placeholder;if(r.elementId==="childName"&&e.title?i=e.title:r.elementId==="hebrewDate"&&e.subtitle?i=e.subtitle:r.elementId==="barMitzvahLabel"&&r.content&&(i=r.content),!i)continue;const a=r.position&&r.position.x!==void 0?r.position.x:r.x,l=r.position&&r.position.y!==void 0?r.position.y:r.y;let c=0,d="left";const p=r.alignment&&r.alignment.method||"",u=r.alignment&&r.alignment.horizontal||r.style&&r.style.align||"left",g=parseFloat(a)||50,m=parseFloat(l)||50;p.includes("transform: translateX(-50%)")||u==="center"?(c=g/100*o,d="center"):p.includes("right:")||u==="right"?(c=o-g/100*o,d="right"):(c=g/100*o,d="left");const y=m/100*s,w=r.style?parseInt(r.style.size)*.75:12;this.doc.setFontSize(w);const b=this.mapFont(r.style?.font,null,i);this.doc.setFont(b,"normal");const v=r.style?.color||e.textColor||"#000000",S=this.resolveColorSafe(v);this.doc.setTextColor(S);const f=this.processText(i);if(f)try{this.doc.text(String(f),c,y+w/2,{align:d})}catch(x){console.error("PDF: Failed to render cover text:",x)}}n.decorations&&this.renderDecorations(n.decorations,o,s)}else if(console.log("PDF: Using fallback cover layout"),this.doc.setTextColor(e.textColor||"#000000"),e.layout==="full-bleed"){e.frontPhotoId&&await this.drawImage(e.frontPhotoId,0,0,o,s,t),this.doc.setFontSize(24);const r=this.mapFont(e.titleFont||e.theme,null,e.title);this.doc.setFont(r,"bold"),this.doc.text(this.processText(e.title),o/2,s-30,{align:"center"}),this.doc.setFontSize(14);const i=this.mapFont(e.subtitleFont||e.theme,null,e.subtitle);this.doc.setFont(i,"normal"),this.doc.text(this.processText(e.subtitle),o/2,s-20,{align:"center"})}else{e.frontPhotoId&&await this.drawImage(e.frontPhotoId,o*.1,s*.1,o*.8,s*.6,t),this.doc.setFontSize(24);const r=this.mapFont(e.titleFont||e.theme,null,e.title);this.doc.setFont(r,"bold"),this.doc.text(this.processText(e.title),o/2,s-80,{align:"center"}),this.doc.setFontSize(14);const i=this.mapFont(e.subtitleFont||e.theme,null,e.subtitle);this.doc.setFont(i,"normal"),this.doc.text(this.processText(e.subtitle),o/2,s-60,{align:"center"})}}async renderSpine(e,t){const o=this.doc.internal.pageSize.getWidth(),s=this.doc.internal.pageSize.getHeight();if(console.log("[PDF] Rendering Spine Page"),await this.drawBackground(e.color,e.theme,o,s),e.title||e.subtitle){this.doc.setTextColor(e.textColor||"#FFFFFF");const n=o/2,r=s/2;if(this.doc.saveGraphicsState(),e.title){this.doc.setFontSize(18);const i=this.mapFont(e.titleFont||e.theme,null,e.title);this.doc.setFont(i,"bold");const a=this.processText(e.title);this.doc.text(a,n,r-20,{align:"center",angle:90})}if(e.subtitle){this.doc.setFontSize(12);const i=this.mapFont(e.subtitleFont||e.theme,null,e.subtitle);this.doc.setFont(i,"normal");const a=this.processText(e.subtitle);this.doc.text(a,n,r+40,{align:"center",angle:90})}this.doc.restoreGraphicsState()}}async renderBackCover(e,t){const o=this.doc.internal.pageSize.getWidth(),s=this.doc.internal.pageSize.getHeight();console.log(`[PDF] Rendering Back Cover - backPhotoId: ${e.backPhotoId}`),await this.drawBackground(e.color,e.theme,o,s),e.backPhotoId?(console.log(`[PDF] Drawing back cover photo (full page): ${e.backPhotoId}`),await this.drawImage(e.backPhotoId,0,0,o,s,t,{photoStyle:"default"})):console.warn("[PDF] No backPhotoId provided for back cover")}async renderPageToPDF(e,t){const o=this.doc.internal.pageSize.getWidth(),s=this.doc.internal.pageSize.getHeight();let n=null;const r=e.layoutId||e.rawLayoutId||(e.layout?e.layout.id:null);if(e.layout&&e.layout.slots&&e.layout.slots.length>0?(n=e.layout,console.log(`PDF: Using specific page.layout for page ${e.id} (Prioritizing over template ID)`)):this.templateConfig&&this.templateConfig.pageLayouts&&r?(n=this.templateConfig.pageLayouts.find(c=>c.layoutId===r),n?(console.log(`PDF: Hydrating page ${e.id} with layout ${r}`),console.log(`PDF: Layout Stats - Slots: ${n.photoSlots?.length}, Text: ${n.textElements?.length}, Decos: ${n.decorations?.length}`)):console.warn(`PDF: Layout ${r} not found in template config!`)):e.layout?(n=e.layout,console.log(`PDF: Using legacy page.layout for page ${e.id}`)):console.warn(`PDF: No layout definition found for page ${e.id} (targetId: ${r})`),await this.drawBackground(e.background,null,o,s),e.pageFrameId&&window.PAGE_FRAMES){const c=window.PAGE_FRAMES.find(d=>d.id===e.pageFrameId);if(c)try{const d=c.svgGen(o,s,c.color);await this.drawSvg(d,0,0,o,s)}catch(d){console.warn("PDF: Failed to draw frame",d)}}const i=n&&n.photoSlots?n.photoSlots:n&&n.slots?n.slots:e.slots;if(i){console.log(`PDF: Processing ${i.length} photo slots...`);let c=e.photos||[];c.length===0&&i.length>0&&i.some(p=>p.photoId)&&(console.log("PDF: Detected embedded photoIds in slots. Extracting..."),c=i.map(p=>p.photoId?{id:p.photoId}:null)),console.log(`PDF: User photos available: ${c.length}`,c);for(let d=0;d<i.length;d++){const p=i[d];let u=c[d];if(!u&&(p.photoId||p.assetId)&&(u={id:p.photoId||p.assetId}),u){const g=p.position&&p.position.x!==void 0?p.position.x:p.x,m=p.position&&p.position.y!==void 0?p.position.y:p.y,y=p.size&&p.size.width!==void 0?p.size.width:p.width,w=p.size&&p.size.height!==void 0?p.size.height:p.height,b=parseFloat(g)/100*o,v=parseFloat(m)/100*s,S=parseFloat(y)/100*o,f=parseFloat(w)/100*s,x=p.shape||e.imageShape||"rect",C=x!=="rect";if(C)if(this.doc.saveGraphicsState(),x==="circle"){const E=Math.min(S,f)/2,T=b+S/2,k=v+f/2;this.doc.circle(T,k,E),this.doc.clip()}else if(x==="oval"){const E=S/2,T=f*.45,k=b+S/2,L=v+f/2;this.doc.ellipse(k,L,E,T),this.doc.clip()}else x==="rounded"&&(this.doc.roundedRect(b,v,S,f,12,12),this.doc.clip());await this.drawImage(u.assetId||u.id||u,b,v,S,f,t,p),C&&this.doc.restoreGraphicsState();const I=p.frameId||e.imageFrameId;if(I&&window.IMAGE_FRAMES){const E=window.IMAGE_FRAMES.find(T=>T.id===I);if(E){const T=p.shape||e.imageShape||"rect",k=p.frameColor||e.imageFrameColor||E.color;try{const L=E.svgGen(S,f,k,T);await this.drawSvg(L,b,v,S,f),console.log(`PDF: Drew image frame ${I} at slot ${d}`)}catch(L){console.warn(`PDF: Failed to draw image frame ${I}`,L)}}}}else console.log(`PDF: No photo for slot ${d}`)}}else console.log("PDF: No photo slots defined.");const a=n&&n.decorations?n.decorations:e.decorations;a&&this.renderDecorations(a,o,s);const l=n&&n.textElements?n.textElements:e.elements&&e.elements.length>0?e.elements:null;if(l){console.log(`PDF: Processing ${l.length} text/visual elements...`);for(const c of l){if(c.type==="element"){await this.drawVisualElement(c,o,s);continue}let d=c.content||c.placeholder;e.textContent&&e.textContent[c.elementId]&&(d=e.textContent[c.elementId]);const p=c.position&&c.position.x!==void 0?c.position.x:c.x,u=c.position&&c.position.y!==void 0?c.position.y:c.y,g={...c,content:d||"",x:parseFloat(p),y:parseFloat(u),fontSize:c.style?parseInt(c.style.size):c.fontSize||12,fontFamily:c.style?c.style.font:c.fontFamily||"body",color:c.style?c.style.color:c.color||"#000000",alignment:c.alignment||{horizontal:c.align||"left"},style:c.style};if(!g.content){console.log(`PDF: Skipping empty text element ${c.elementId}`);return}let m=0,y="left";const w=g.alignment&&g.alignment.method||"",b=g.alignment&&g.alignment.horizontal||g.style&&g.style.align||"left";if(w.includes("transform: translateX(-50%)")||b==="center")m=o/2,g.x&&(m=g.x/100*o),y="center";else if(w.includes("right:")||b==="right"){const E=g.x||6;m=o-E/100*o,y="right"}else m=(g.x||6)/100*o,y="left";const v=g.y/100*s,S=g.fontSize?g.fontSize*.75:12;this.doc.setFontSize(S);const f=this.mapFont(g.fontFamily,g.styleId,g.content);console.log(`PDF: Text "${g.content?.substring(0,20)}..." -> fontFamily key: "${g.fontFamily}" -> mapped to: "${f}"`),this.doc.setFont(f,"normal");const x=g.color||g.style&&g.style.color||"#000000",C=this.resolveColorSafe(x);this.doc.setTextColor(C);const I=this.processText(g.content);if(!I)return;if(isNaN(m)||isNaN(v)){console.warn("PDF: Invalid coordinates for text",g,{x:m,y:v});return}try{this.doc.text(String(I),m,v+S/2,{align:y})}catch(E){console.error("PDF: Failed to render text element:",I,E);try{this.doc.setFont("helvetica","normal"),this.doc.text(String(I),m,v+S/2,{align:y})}catch(T){console.error("PDF: Fallback failed too",T)}}}}else console.log("PDF: No text elements defined.")}renderDecorations(e,t,o){e&&e.forEach(s=>{const n=s.position||{x:0,y:0},r=parseFloat(n.x)/100*t,i=parseFloat(n.y)/100*o,a=s.size&&s.size.width?parseFloat(s.size.width)/100*t:0;s.size&&s.size.height&&parseFloat(s.size.height)/100*o;const l=this.resolveColorSafe(s.color||"gold");if(this.doc.setDrawColor(l),this.doc.setFillColor(l),s.type==="goldLine")this.doc.setLineWidth(2),this.doc.rect(r,i,a,2,"F");else if(s.type==="starOfDavid"){const c=r,d=i,p=a/2;this.doc.setLineWidth(1),this.doc.triangle(c,d-p,c-p*.866,d+p*.5,c+p*.866,d+p*.5,"S"),this.doc.triangle(c,d+p,c-p*.866,d-p*.5,c+p*.866,d-p*.5,"S")}else s.type==="ornament"&&(this.doc.setLineWidth(1),this.doc.line(r,i-10,r+10,i),this.doc.line(r+10,i,r,i+10),this.doc.line(r,i+10,r-10,i),this.doc.line(r-10,i,r,i-10))})}async drawVisualElement(e,t,o){if(e.url)try{const s=parseFloat(e.x)/100*t,n=parseFloat(e.y)/100*o,r=(parseFloat(e.pixelWidth)||100)/800*t,i=(parseFloat(e.pixelHeight)||100)/600*o;let a="";e.filterHue&&(a+=`hue-rotate(${e.filterHue}deg) `),e.filterBrightness&&e.filterBrightness!==100&&(a+=`brightness(${e.filterBrightness}%) `),e.filterShadow&&(a+=`drop-shadow(4px 8px 12px ${e.filterShadowColor||"rgba(0,0,0,0.5)"}) `),a=a.trim();const l=await new Promise((m,y)=>{const w=new Image;w.crossOrigin="Anonymous",w.onload=()=>{const b=document.createElement("canvas");b.width=(w.width||r)*2,b.height=(w.height||i)*2;const v=b.getContext("2d");v.scale(2,2),a&&(v.filter=a),v.drawImage(w,0,0,w.width||r,w.height||i),m(b.toDataURL("image/png"))},w.onerror=()=>y(new Error("Visual Element load failed")),w.src=e.url});let c=1;if(e.transform&&e.transform.includes("scale")){const m=e.transform.match(/scale\(([^)]+)\)/);m&&m[1]&&(c=parseFloat(m[1]))}const d=r*c,p=i*c,u=s-(d-r)/2,g=n-(p-i)/2;this.doc.addImage(l,"PNG",u,g,d,p,void 0,"FAST")}catch(s){console.warn("PDF: Failed to draw visual element",e.url,s)}}async drawBackground(e,t,o,s){if(t){const n=window.BACKGROUND_TEXTURES?.find(r=>r.id===t);if(n&&await this.drawTexture(n,o,s))return}if(e&&typeof e=="object"){const n=e;if(n.type==="image"||n.imageUrl){const r={url:n.imageUrl,id:"temp-bg-image"};if(await this.drawTexture(r,o,s))return}else if(n.type==="ai_generated"&&n.ai_image_url){const r={url:n.ai_image_url,id:"temp-ai-bg"};if(await this.drawTexture(r,o,s))return}else if(n.color){this.doc.setFillColor(n.color),this.doc.rect(0,0,o,s,"F");return}else if(n.type==="gradient"&&n.gradient_colors){this.doc.setFillColor(n.gradient_colors[0]),this.doc.rect(0,0,o,s,"F");return}}if(typeof e=="string"&&e){if(!e.startsWith("#")&&!e.startsWith("rgb")){const n=window.BACKGROUND_TEXTURES?.find(r=>r.id===e);if(n&&await this.drawTexture(n,o,s))return}if(e.startsWith("#")||e.startsWith("rgb")){this.doc.setFillColor(e),this.doc.rect(0,0,o,s,"F");return}if(e==="classic"){this.doc.setFillColor("#1e293b"),this.doc.rect(0,0,o,s,"F");return}try{this.doc.setFillColor(e),this.doc.rect(0,0,o,s,"F");return}catch{console.warn("PDF: Invalid color string",e)}}this.doc.setFillColor("#ffffff"),this.doc.rect(0,0,o,s,"F")}async drawTexture(e,t,o){if(e&&e.url)try{let s=e.url;s.includes("unsplash.com")&&s.includes("&w=")&&(s=s.replace(/&w=\d+/,"&w=2048"));const n=await this.loadImage(s),r=this.calculateCoverDimensions(0,0,t,o,n.width,n.height);return this.doc.saveGraphicsState(),this.doc.rect(0,0,t,o),this.doc.clip(),this.doc.addImage(n.data,"JPEG",r.x,r.y,r.width,r.height),this.doc.restoreGraphicsState(),!0}catch(s){console.warn("PDF: Failed to load texture",e.id,s)}return!1}async drawSvg(e,t,o,s,n){if(e)return new Promise(r=>{const a=s*4,l=n*4,c=document.createElement("canvas");c.width=a,c.height=l;const d=c.getContext("2d"),p=`<svg xmlns="http://www.w3.org/2000/svg" width="${a}" height="${l}" viewBox="0 0 ${s} ${n}">${e}</svg>`,u=btoa(unescape(encodeURIComponent(p))),g=new Image;g.onload=()=>{d.drawImage(g,0,0,a,l);try{const m=c.toDataURL("image/png");this.doc.addImage(m,"PNG",t,o,s,n)}catch(m){console.error("PDF: Failed to add rasterized SVG",m)}r()},g.onerror=m=>{console.error("PDF: SVG Rasterization Failed",m),r()},g.src="data:image/svg+xml;base64,"+u})}async drawImage(e,t,o,s,n,r,i=null){const a=(r&&r.photos?r.photos.find(l=>l.id===e):null)||(window.app&&window.app.state?window.app.state.assets.photos.find(l=>l.id===e):null);if(a){console.log(`[PDF] Drawing image ${e} at ${t.toFixed(1)},${o.toFixed(1)} (${s.toFixed(1)}x${n.toFixed(1)})`);try{let l=!1,c=null,d=0,p=0;const u=i?.photoStyle||"default",m=(this.templateConfig?.designSystem?.photoStyles||{})[u]||{};if(console.log(`[PDF] Photo style: ${u}`,m),a.source==="google-photos"||a.url&&a.url.includes("googleusercontent.com"))try{console.log(`[PDF] Attempting High Res Proxy for ${e} (isGoogle=true)...`);const f=a.url||a.rawBaseUrl;console.log(`[PDF] Proxy Target URL: ${f?f.substring(0,50)+"...":"null"}`);const x=await this.fetchHighResViaProxy(f);if(x){console.log(`[PDF] High Res Proxy SUCCESS for ${e}. Length: ${x.length}`),c=x;const C=await this.getBase64Dimensions(x);d=C.width,p=C.height,l=!0}else console.warn(`[PDF] High Res Proxy returned empty/null for ${e}`)}catch(f){console.warn(`[PDF] High Res Proxy FAILED for ${e}:`,f)}else console.log(`[PDF] Image is NOT identified as Google Photo. Source: ${a.source}, URL: ${a.url?a.url.substring(0,30):"null"}`);if(!l){console.log(`[PDF] Method 2: Standard Load for ${e}`);let f=a.rawBaseUrl||a.url||a.highResUrl||a.thumbnailUrl;if(typeof a=="string"&&(f=a),f&&f.includes("unsplash.com")&&f.includes("&w=")&&(f=f.replace(/&w=\d+/,"&w=3000")),f&&(a.source==="google-photos"||f&&f.includes("googleusercontent.com"))&&(f=(f.includes("=")?f.split("=")[0]:f)+"=w2048-h2048"),f&&f.startsWith("data:")){console.log(`[PDF] Using Data URI for ${e}`),c=f;const x=await this.getBase64Dimensions(f);d=x.width,p=x.height,l=!0}else if(f){console.log(`[PDF] Loading Image from URL: ${f.substring(0,50)}...`);const x=await this.loadImage(f);c=x.data,d=x.width,p=x.height,l=!0}}if(!l||!c)throw console.error(`[PDF] CRITICAL: All image loading strategies failed for ${e}`),new Error("All image loading strategies failed");console.log(`[PDF] Image natural size: ${d}x${p}, slot: ${s.toFixed(1)}x${n.toFixed(1)}`);const w=this.calculateCoverDimensions(t,o,s,n,d,p);console.log(`[PDF] Cover dimensions: x=${w.x.toFixed(1)}, y=${w.y.toFixed(1)}, w=${w.width.toFixed(1)}, h=${w.height.toFixed(1)}`);const b=m.borderRadius||"0px",v=parseFloat(b)*.75,S=b==="50%";if(this.doc.saveGraphicsState(),S){const f=Math.min(s,n),x=t+s/2,C=o+n/2,I=f/2;this.drawCircleClipPath(x,C,I)}else v>0?this.drawRoundedRectClipPath(t,o,s,n,v):this.doc.rect(t,o,s,n);this.doc.clip(),this.doc.addImage(c,"JPEG",w.x,w.y,w.width,w.height),this.doc.restoreGraphicsState(),m.border&&m.border!=="none"&&this.drawPhotoFrame(t,o,s,n,m,S,v)}catch(l){console.warn("Failed to load image for PDF:",e,l),this.doc.setDrawColor(200,200,200),this.doc.setFillColor(240,240,240),this.doc.rect(t,o,s,n,"FD"),this.doc.line(t,o,t+s,o+n),this.doc.line(t+s,o,t,o+n)}}else console.warn(`[PDF] Photo with ID ${e} NOT FOUND in assets.`)}drawCircleClipPath(e,t,o){const s=.5522848,n=o*s,r=o*s,i=this.doc;i.moveTo(e+o,t),i.curveTo(e+o,t+r,e+n,t+o,e,t+o),i.curveTo(e-n,t+o,e-o,t+r,e-o,t),i.curveTo(e-o,t-r,e-n,t-o,e,t-o),i.curveTo(e+n,t-o,e+o,t-r,e+o,t)}drawRoundedRectClipPath(e,t,o,s,n){const r=this.doc,i=Math.min(n,o/2,s/2);r.moveTo(e+i,t),r.lineTo(e+o-i,t),r.curveTo(e+o,t,e+o,t+i,e+o,t+i),r.lineTo(e+o,t+s-i),r.curveTo(e+o,t+s,e+o-i,t+s,e+o-i,t+s),r.lineTo(e+i,t+s),r.curveTo(e,t+s,e,t+s-i,e,t+s-i),r.lineTo(e,t+i),r.curveTo(e,t,e+i,t,e+i,t)}drawPhotoFrame(e,t,o,s,n,r,i){const l=(n.border||"").match(/(\d+)px\s+(\w+)\s+(#[A-Fa-f0-9]+|rgba?\([^)]+\)|\w+)/);if(!l)return;const c=parseFloat(l[1])*.75,d=l[2],p=this.resolveColorSafe(l[3]);if(console.log(`[PDF] Drawing frame: ${c}pt ${d} ${p}`),this.doc.setDrawColor(p),this.doc.setLineWidth(c),d==="dashed"?this.doc.setLineDashPattern([4,4],0):this.doc.setLineDashPattern([],0),r){const u=Math.min(o,s),g=e+o/2,m=t+s/2,y=u/2;this.doc.circle(g,m,y,"S")}else i>0?this.drawRoundedRect(e,t,o,s,i,"S"):this.doc.rect(e,t,o,s,"S");this.doc.setLineDashPattern([],0)}drawRoundedRect(e,t,o,s,n,r="S"){const i=this.doc,a=Math.min(n,o/2,s/2);i.moveTo(e+a,t),i.lineTo(e+o-a,t),i.curveTo(e+o,t,e+o,t+a,e+o,t+a),i.lineTo(e+o,t+s-a),i.curveTo(e+o,t+s,e+o-a,t+s,e+o-a,t+s),i.lineTo(e+a,t+s),i.curveTo(e,t+s,e,t+s-a,e,t+s-a),i.lineTo(e,t+a),i.curveTo(e,t,e+a,t,e+a,t),r==="F"?i.fill():r==="FD"||r==="DF"?i.fillStroke():i.stroke()}async fetchHighResViaProxy(e){try{const t=J.getFunctions();if(!t)throw new Error("Firebase Functions not initialized");const s=await t.httpsCallable("fetchHighResImage")({url:e});if(s.data&&s.data.success&&s.data.dataUri)return s.data.dataUri;throw s.data&&s.data.error?new Error(`Proxy Error: ${s.data.error}`):new Error("Invalid proxy response structure")}catch(t){throw console.warn("High Res Proxy Call Error:",t.message,t.details||""),t}}async loadImage(e){const o=s=>new Promise((n,r)=>{const i=new Image;i.crossOrigin="Anonymous",i.onload=()=>{const a=i.width,l=i.height,c=Math.max(a,l),d=c<2048?2048/c:1,p=Math.round(a*d),u=Math.round(l*d),g=document.createElement("canvas");g.width=p,g.height=u;const m=g.getContext("2d");m.imageSmoothingEnabled=!0,m.imageSmoothingQuality="high",m.drawImage(i,0,0,p,u);try{const y=g.toDataURL("image/jpeg",.98);d>1&&console.log(`[PDF] Image upscaled: ${a}x${l} → ${p}x${u} (${d.toFixed(2)}x)`),n({data:y,width:p,height:u})}catch(y){r(y)}},i.onerror=()=>r(new Error(`Image load failed: ${s?.substring(0,50)}`)),i.src=s});try{return await o(e)}catch(s){if(console.warn("[PDF] Primary load failed, trying fallbacks...",s.message),e&&e.includes("googleusercontent.com")){const n=e.includes("=")?e.split("=")[0]:e,r=[n+"=w1600-h1600",n+"=w1200-h1200",n+"=s1200"];for(const i of r)try{return console.log(`[PDF] Trying fallback: ${i.substring(0,60)}...`),await o(i)}catch{continue}}throw s}}calculateCoverDimensions(e,t,o,s,n,r){const i=o/s,a=n/r;let l,c,d,p;return a>i?(c=s,l=s*a,d=e-(l-o)/2,p=t):(l=o,c=o/a,d=e,p=t-(c-s)/2),{x:d,y:p,width:l,height:c}}async getBase64Dimensions(e){return new Promise((t,o)=>{const s=new Image;s.onload=()=>t({width:s.width,height:s.height}),s.onerror=o,s.src=e})}resolveColorSafe(e){if(!e)return"#000000";if(this.templateConfig&&this.templateConfig.designSystem&&this.templateConfig.designSystem.colors){const o=this.templateConfig.designSystem.colors;o.text&&(e==="primary"&&o.text.primary?e=o.text.primary:e==="secondary"&&o.text.secondary&&(e=o.text.secondary)),e==="accent"&&o.accent&&(e=o.accent),e==="background"&&o.background&&(e=o.background),o.palette&&o.palette[e]&&(e=o.palette[e])}const t={primary:"#1B365D",secondary:"#4A5568",light:"#718096",gold:"#C9A227",navy:"#1B365D",white:"#FFFFFF"};if(t[e]&&(e=t[e]),typeof e=="string"&&e.startsWith("rgba")){const o=e.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);if(o){const[s,n,r,i]=o;return`rgb(${n},${r},${i})`}}return typeof e=="string"&&(e.startsWith("#")||e.startsWith("rgb"))?e:(console.warn("PDF: Unknown color encountered, using black:",e),"#000000")}async loadHebrewFont(){if(!this.hebrewFontLoaded)try{console.log("PDF: Fetching Hebrew Font (Alef)...");const e=await fetch("fonts/Alef-Regular.ttf");if(!e.ok)throw new Error("Font fetch failed: "+e.statusText);const t=await e.blob(),o=new FileReader;return new Promise((s,n)=>{o.onloadend=()=>{if(!o.result){console.error("PDF: Font load result empty"),s();return}const r=o.result.split(","),i=r.length>1?r[1]:null;if(console.log("PDF: Hebrew font base64 length:",i?i.length:0),i){if(console.log("PDF: Base64 first 20 chars:",i.substring(0,20)),i.substring(0,20).includes("PCFET0NUWQ")){console.error("PDF: Font file seems to be HTML (404/Error page). Aborting font load."),this.hebrewFontLoaded=!1,s();return}try{this.doc.addFileToVFS("Alef-Regular.ttf",i),this.doc.addFont("Alef-Regular.ttf","Rubik","normal"),this.doc.addFont("Alef-Regular.ttf","Rubik","bold"),console.log("PDF: Verifying Hebrew font..."),this.doc.setFont("Rubik","normal"),this.hebrewFontLoaded=!0,console.log("PDF: Hebrew Font Loaded and Verified (normal + bold)."),s()}catch(a){console.error("PDF: Error registering or verifying font",a),this.hebrewFontLoaded=!1,s()}}else console.warn("PDF: Empty or invalid font data"),s()},o.onerror=r=>{console.error("PDF: FileReader error",r),n(r)},o.readAsDataURL(t)})}catch(e){console.warn("PDF: Could not load Hebrew font. Text may not render correctly.",e)}}processText(e){return e?/[\u0590-\u05FF]/.test(e)?e.split("").reverse().join(""):e:""}mapFont(e,t,o){if(o&&/[\u0590-\u05FF]/.test(o))return this.hebrewFontLoaded?"Rubik":(console.warn("PDF: Hebrew content detected but font not loaded. Using fallback."),"helvetica");if(this.templateConfig&&this.templateConfig.designSystem&&this.templateConfig.designSystem.typography){const n=this.templateConfig.designSystem.typography;if(console.log(`PDF mapFont: Checking "${e}" in typography:`,Object.keys(n)),e&&n[e]){const r=n[e];if(console.log(`PDF mapFont: Found config for "${e}":`,r.family),r.family){const i=r.family.toLowerCase();return i.includes("serif")||i.includes("playfair")||i.includes("merriweather")||i.includes("cormorant")||i.includes("garamond")?(console.log(`PDF mapFont: "${r.family}" -> times (serif)`),"times"):i.includes("mono")||i.includes("courier")?(console.log(`PDF mapFont: "${r.family}" -> courier (mono)`),"courier"):i.includes("script")||i.includes("cursive")||i.includes("pinyon")||i.includes("allura")?(console.log(`PDF mapFont: "${r.family}" -> times-italic (script fallback)`),"times"):(console.log(`PDF mapFont: "${r.family}" -> helvetica (sans default)`),"helvetica")}}else console.warn(`PDF mapFont: No typography config found for "${e}"`)}else console.warn("PDF mapFont: No template config available");if(t){if(t.includes("serif"))return"times";if(t.includes("typewriter"))return"courier"}const s=(e||"").toLowerCase();return s.includes("serif")||s.includes("playfair")||s.includes("merriweather")||s.includes("dm serif")?"times":s.includes("mono")||s.includes("courier")?"courier":"helvetica"}showSuccessModal(e){const t=document.getElementById("pdfDownloadModal"),o=document.getElementById("btn-download-trigger");if(t&&o){const s=o.cloneNode(!0);o.parentNode.replaceChild(s,o),s.innerHTML='<i class="fa-solid fa-check"></i> Download Started',s.onclick=n=>{n.preventDefault(),t.classList.remove("active")},t.classList.add("active"),setTimeout(()=>{t.classList.remove("active")},3e3)}}showDownloadModal(e,t){const o=document.getElementById("pdfDownloadModal"),s=document.getElementById("btn-download-trigger"),n=t||`photo-book-${new Date().toISOString().slice(0,10)}.pdf`;if(o&&s){const r=s.cloneNode(!0);s.parentNode.replaceChild(r,s),r.onclick=i=>{i.preventDefault(),console.log(`[PDF] Button Clicked. Filename: ${n}`),console.log(`[PDF] URL MIME type check - URL: ${e.substring(0,50)}...`),r.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Downloading...';try{const a=document.createElement("a");a.style.display="none",a.href=e,a.download=n,a.type="application/pdf",document.body.appendChild(a),a.click(),console.log(`[PDF] Download triggered for ${n} (Type: application/pdf)`),setTimeout(()=>{r.innerHTML="Download PDF",document.body.contains(a)&&document.body.removeChild(a),URL.revokeObjectURL(e)},3e3)}catch(a){console.error("[PDF] Download error:",a),alert("שגיאת הורדה: "+a.message),r.innerHTML="הורד PDF"}},o.classList.add("active")}else{const r=document.createElement("a");r.href=e,r.download=n,document.body.appendChild(r),r.click(),document.body.removeChild(r),setTimeout(()=>URL.revokeObjectURL(e),6e4)}}}const de=new Ge,We="http://127.0.0.1:8001";class Ye{constructor(){this.baseUrl=We}async create(e){const t=e.photos.map(s=>({id:s.id,url:s.url||s.rawBaseUrl,thumbnailUrl:s.thumbnailUrl,rawBaseUrl:s.rawBaseUrl,name:s.name||s.filename})),o={user_id:e.user_id||"web_user",prompt:e.prompt||"",photos:t,max_pages:e.max_pages||10,photos_per_page:e.photos_per_page||3};try{console.log("[MagicCreateAPI] Sending request:",o);const s=await fetch(`${this.baseUrl}/magic/create`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});if(!s.ok){const r=await s.text();throw new Error(`Magic Create failed: ${s.status} - ${r}`)}return await s.json()}catch(s){throw console.error("[MagicCreateAPI] Request error:",s),s}}async getStyles(){try{const e=await fetch(`${this.baseUrl}/magic/styles`);if(!e.ok)throw new Error("Failed to fetch styles");return(await e.json()).styles}catch(e){return console.warn("[MagicCreateAPI] Styles fetch failed, returning default",e),[{id:"modern",name:"Modern",description:"Clean and contemporary"},{id:"classic",name:"Classic",description:"Timeless elegance"}]}}async preview(e){return this.create({...e,max_pages:1})}}const Xe=new Ye;class Ve{constructor(){this.isProcessing=!1,this.progressCallback=null}async run(e,t="",o=()=>{}){if(this.isProcessing){console.warn("[MagicCreateV2] Already processing");return}this.isProcessing=!0,this.progressCallback=o;try{console.log("[MagicCreateV2] Starting pipeline via Backend API"),this._updateProgress("Analyzing & Designing...",10);const s={user_id:"web_user",prompt:t||"Auto curated album",photos:e,max_pages:Math.ceil(e.length/3)+2,photos_per_page:3};this._updateProgress("Generating Layouts (Gemini)...",40);const n=await Xe.create(s);if(!n.success)throw new Error(n.error||"Failed to generate album");const r=n.pages,i=n.theme,a=n.album_id;this._updateProgress("Compiling Assets...",80);const l=this._mapBackendToEditor({pages:r},e);return this._updateProgress("Ready!",100),{albumId:a,theme:i,pages:l}}catch(s){throw console.error("[MagicCreateV2] Pipeline failed:",s),this._updateProgress("Error: "+s.message,0),s}finally{this.isProcessing=!1}}_updateProgress(e,t){this.progressCallback&&this.progressCallback(e,t)}_mapBackendToEditor(e,t){return console.log("[MagicCreateV2] Mapping",e.pages.length,"pages from backend"),e.pages.map(o=>({...o,id:o.id||`page_${Math.random().toString(36).substr(2,9)}`}))}_convertPage(e,t,o,s){return e}}const Ke=new Ve;window.magicCreateV2=Ke;const Je="modulepreload",Qe=function(P){return"/"+P},Pe={},ne=function(e,t,o){let s=Promise.resolve();if(t&&t.length>0){let a=function(l){return Promise.all(l.map(c=>Promise.resolve(c).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};document.getElementsByTagName("link");const r=document.querySelector("meta[property=csp-nonce]"),i=r?.nonce||r?.getAttribute("nonce");s=a(t.map(l=>{if(l=Qe(l),l in Pe)return;Pe[l]=!0;const c=l.endsWith(".css"),d=c?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${d}`))return;const p=document.createElement("link");if(p.rel=c?"stylesheet":Je,c||(p.as="script"),p.crossOrigin="",p.href=l,i&&p.setAttribute("nonce",i),document.head.appendChild(p),c)return new Promise((u,g)=>{p.addEventListener("load",u),p.addEventListener("error",()=>g(new Error(`Unable to preload CSS for ${l}`)))})}))}function n(r){const i=new Event("vite:preloadError",{cancelable:!0});if(i.payload=r,window.dispatchEvent(i),!i.defaultPrevented)throw r}return s.then(r=>{for(const i of r||[])i.status==="rejected"&&n(i.reason);return e().catch(n)})};function Ze(P){const e=P.length,t=e>0?P.reduce((r,i)=>r+i,0)/e:1.33;if(e===1)return[[0]];if(e===2)return t<.9?[[0],[1]]:[[0,1]];if(e===3)return t<.85?[[0],[1,2]]:t>1.5?[[0,1,2]]:[[0,1],[2]];if(e===4)return[[0,1],[2,3]];if(e===5)return t>1.3?[[0,1,2],[3,4]]:[[0,1],[2,3,4]];if(e===6)return t>1.2?[[0,1,2],[3,4,5]]:[[0,1],[2,3],[4,5]];const o=Math.max(2,Math.round(Math.sqrt(e*.75))),s=Math.ceil(e/o),n=[];for(let r=0;r<e;r+=s)n.push(Array.from({length:Math.min(s,e-r)},(i,a)=>r+a));return n}function _e(P,e=2,t=.5){const o=P.length;if(!o)return null;const s=100-2*e,n=100-2*e,r=P.map(p=>{const u=p.width&&p.height?p.width/p.height:1.3333333333333333;return Math.max(.45,Math.min(2.8,u))}),i=Ze(r),a=i.length,l=(n-t*(a-1))/a,c=new Array(o);let d=e;for(const p of i){const u=p.length,g=t*(u-1),m=p.map(v=>l*r[v]),y=m.reduce((v,S)=>v+S,0),w=(s-g)/y;let b=e;p.forEach((v,S)=>{const f=m[S]*w;c[v]={x:b,y:d,width:f,height:l},b+=f+t}),d+=l+t}return c}function et(P,e=0,t=1){const o=P.length;if(!o)return null;if(o===1)return[{x:e,y:e,width:100-2*e,height:100-2*e}];if(o===2){const c=60-t/2,d=40-t/2,p=100-2*e;return[{x:e,y:e,width:c,height:p},{x:e+c+t,y:e,width:d,height:p}]}if(o===3){const c=60-t/2,d=40-t/2,p=100-2*e,u=(p-t)/2;return[{x:e,y:e,width:c,height:p},{x:e+c+t,y:e,width:d,height:u},{x:e+c+t,y:e+u+t,width:d,height:u}]}if(o===4){const c=60-t/2,d=40-t/2,p=100-2*e,u=(p-t*2)/3,g=[{x:e,y:e,width:c,height:p}];for(let m=0;m<3;m++)g.push({x:e+c+t,y:e+m*(u+t),width:d,height:u});return g}const s=55-t/2,n=45-t/2,r=o-1,i=100-2*e,a=(i-t*(r-1))/r,l=[{x:e,y:e,width:i,height:s}];for(let c=0;c<r;c++)l.push({x:e+c*(a+t),y:e+s+t,width:a,height:n});return l}function tt(P,e=7,t=2){const o=P.length;if(!o)return null;const s=100-2*e,n=100-2*e;if(o===1)return[{x:e,y:e,width:s,height:n}];if(o===2){const r=(s-t)/2;return[{x:e,y:e,width:r,height:n},{x:e+r+t,y:e,width:r,height:n}]}return _e(P,e,t)}function ot(P,e,t=1,o=1){const s=P.length;if(!s)return null;const n=s<=4?2:s<=9?3:4,r=Math.ceil(s/n),i=100-2*t,a=100-2*t,l=(i-o*(n-1))/n,c=(a-o*(r-1))/r;let d=0;for(let g=0;g<(e||"").length;g++)d=d*31+(e.charCodeAt(g)&255)>>>0;const p=()=>(d=d*1664525+1013904223>>>0,d/4294967296),u=[];for(let g=0;g<s;g++){const m=g%n,y=Math.floor(g/n),w=(p()-.5)*1.5,b=(p()-.5)*1.5,v=.92+p()*.13;u.push({x:t+m*(l+o)+w,y:t+y*(c+o)+b,width:l*v,height:c*v,rotation:(p()-.5)*8})}return u}function st(P,e,t=5,o=5){const s=P.length;if(!s)return null;const n=s<=1?1:s<=2||s<=4?2:s<=6?3:2,r=Math.ceil(s/n),i=100-2*t,a=100-2*t,l=(i-o*(n-1))/n,c=(a-o*(r-1))/r;let d=0;for(let g=0;g<(e||"").length;g++)d=d*31+(e.charCodeAt(g)&255)>>>0;const p=()=>(d=d*1664525+1013904223>>>0,d/4294967296),u=[];for(let g=0;g<s;g++){const m=g%n,y=Math.floor(g/n),b=(g%2===0?-1:1)*(1.5+p()*2.5);u.push({x:t+m*(l+o),y:t+y*(c+o),width:l,height:c,rotation:b})}return u}function nt(P,e,t=5,o=4){const s=P.length;if(!s)return null;let n=0;for(let m=0;m<(e||"").length;m++)n=n*31+(e.charCodeAt(m)&255)>>>0;const r=()=>(n=n*1664525+1013904223>>>0,n/4294967296);if(s===1)return[{x:t+2,y:t+2,width:100-2*t-4,height:100-2*t-4,rotation:(r()-.5)*5}];const i=s<=2?s:s<=4?2:3,a=Math.ceil(s/i),l=100-2*t,c=100-2*t,d=(l-o*(i-1))/i,p=(c-o*(a-1))/a,u=Math.min(2.5,d*.06,p*.06),g=[];for(let m=0;m<s;m++){const y=m%i,w=Math.floor(m/i),b=(r()-.5)*u*2,v=(r()-.5)*u*2;g.push({x:t+y*(d+o)+b,y:t+w*(p+o)+v,width:d,height:p,rotation:(r()-.5)*7})}return g}function it(P,e,t,o,s){if(!t||!P.layout?.slots)return;const n=P.layout.slots.filter(l=>l.photoId);if(!n.length)return;let r=null;switch(t.layoutAlgo){case"hero_sidebar":r=et(e,t.margin,t.gap);break;case"centered":r=tt(e,t.margin,t.gap);break;case"scattered":r=nt(e,s+o,t.margin,t.gap);break;case"full_bleed":n.length>0&&(n[0].x=0,n[0].y=0,n[0].width=100,n[0].height=100,P.layout.slots=P.layout.slots.filter(l=>!l.photoId||l===n[0])),r=null;break;case"dense_wall":r=ot(e,s+o,t.margin,t.gap);break;case"polaroid_grid":r=st(e,s+o,t.margin,t.gap);break;default:r=_e(e,t.margin,t.gap)}r&&(n.forEach((l,c)=>{r[c]&&(l.x=r[c].x,l.y=r[c].y,l.width=r[c].width,l.height=r[c].height,r[c].rotation!==void 0&&(l.rotation=r[c].rotation))}),P.layout.id=t.id+"-"+n.length);const i=P.layout.slots.filter(l=>l.photoId),a=Array.isArray(t.rotation)?t.rotation:null;if(i.forEach((l,c)=>{t.shape&&(l.shape=t.shape),l.frameId=t.frame||null,a&&l.rotation===void 0?l.rotation=a[c%a.length]:!a&&typeof t.rotation=="number"&&t.rotation!==0&&(l.rotation=t.rotation)}),t.lockBackground&&t.bgBias?.length>0){const l=(window.BACKGROUND_TEXTURES||[]).map(d=>d.id),c=t.bgBias.filter(d=>l.includes(d));c.length>0&&(P.background=c[o%c.length])}if(t.textOverlay&&(P.elements||(P.elements=[]),P.elements=P.elements.filter(l=>l._autoOverlay!==!0),P.elements.push({type:"gradient-overlay",_autoOverlay:!0,x:0,y:0,gradient:"linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 30%, transparent 62%)",zIndex:3}),P.elements.forEach(l=>{l.type==="text"&&!l.color&&(l.color="#ffffff")})),t.accentBar){P.elements||(P.elements=[]),P.elements=P.elements.filter(d=>d._accentBar!==!0);const l=t.accentBar,c=l.position==="top"?0:Math.max(0,100-l.height);P.elements.push({type:"shape",shape:"rect",_accentBar:!0,id:"accent_bar_"+Math.random().toString(36).substr(2,6),x:0,y:c,width:100,height:l.height,color:l.color,zIndex:2})}if(t.accentRect){P.elements||(P.elements=[]),P.elements=P.elements.filter(d=>d._accentRect!==!0);const l=t.accentRect,c=l.position==="left"?0:Math.max(0,100-l.width);P.elements.push({type:"shape",shape:"rect",_accentRect:!0,id:"accent_rect_"+Math.random().toString(36).substr(2,6),x:c,y:l.y!=null?l.y:30,width:l.width,height:l.height,color:l.color,zIndex:2})}}class at{constructor(e="https://us-central1-shoso-photobook.cloudfunctions.net"){this.baseUrl=e,this.injectStyles()}async run(e,t,o={}){console.log("[MagicCreate v4] Starting with",t.length,"photos"),console.log("[MagicCreate v4] Prompt:",e);try{this.showProgress("analyzing");const s=await this.analyzePhotos(t);return s.trash_photos&&s.trash_photos.length>0?new Promise((n,r)=>{this.showReviewDialog(s,async i=>{try{const a=await this.createWithApprovedPhotos(e,i,t,o);n(a)}catch(a){r(a)}},()=>r(new Error("Cancelled by user")))}):await this.createWithApprovedPhotos(e,t.map(n=>n.id),t,o)}catch(s){throw this.hideProgress(),console.error("[MagicCreate v4] Error:",s),s}}async analyzePhotos(e){if(console.log(`[MagicCreate v4] Analyzing ${e.length} photos...`),!e.some(n=>{const r=n.thumbnailUrl||n.rawBaseUrl||n.url||"";return r.startsWith("http://")||r.startsWith("https://")})){const n=window.photoQualityService?.analysisCache;if(n&&e.some(i=>n.has(i.id))){console.log("[MagicCreate v4] Using cached analysis from upload step");const i=[],a=[];return e.forEach(l=>{const c=n.get(l.id);c&&(c.isTrash||c.qualityScore<40||c.duplicateGroupId&&!c.isBestInGroup)?a.push({...l,_analysis:c,reason:c.issues?.[0]||"low_quality",details:c.reason_he||c.reason_en||""}):i.push({...l,_analysis:c||null,_visionAnalysis:c||null})}),{valid_photos:i,trash_photos:a,analysis_available:!0}}else return console.log("[MagicCreate v4] No cached analysis — skipping (all photos valid)"),{valid_photos:e.map(i=>({...i})),trash_photos:[],analysis_available:!1}}const o=10,s={valid_photos:[],trash_photos:[],analysis_available:!0};for(let n=0;n<e.length;n+=o){const r=e.slice(n,n+o);try{const i=r.map(l=>{const d=l.url&&l.url.startsWith("data:image")&&l.url.length>5e3;let p=l.thumbnailUrl||(l.rawBaseUrl?l.rawBaseUrl+"=w800-h800":null);return!p&&!d&&(p=l.url),p&&p.startsWith("blob:")&&(p=null),{id:l.id,url:p,thumbnailUrl:l.thumbnailUrl,rawBaseUrl:l.rawBaseUrl,name:l.name,width:l.width,height:l.height}}),a=await fetch(`${this.baseUrl}/magic/analyze-photos`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({photos:i})});if(a.ok){const l=await a.json();l.valid_photos&&s.valid_photos.push(...l.valid_photos),l.trash_photos&&s.trash_photos.push(...l.trash_photos)}else console.warn(`[MagicCreate v4] Batch ${n/o+1} failed: ${a.status}`),s.valid_photos.push(...r)}catch(i){console.warn(`[MagicCreate v4] Batch ${n/o+1} analysis error:`,i),s.valid_photos.push(...r)}}return s}async createWithApprovedPhotos(e,t,o,s){this.showProgress("creating");const n=o.filter(r=>t.includes(r.id));console.log("[MagicCreate v4] Creating with",n.length,"approved photos");try{window._magicPrompt=e;const i=/[\u0590-\u05FF]/.test(e);window._magicIsHebrew=i,console.log(`[MagicCreate v4] Language detection: ${i?"Hebrew":"English"}`);const a=(window.BACKGROUND_TEXTURES||[]).filter(u=>!u.id.startsWith("frame-")&&!u.id.startsWith("img-")).map(u=>({id:u.id,mood:u.tags||u.name||u.id})),l=window.COVER_ELEMENT_LIBRARY,c=l?{backgrounds:(l.backgrounds||[]).map(u=>({id:u.id,type:u.type||"city_skyline",cityEn:u.cityEn||"",countryEn:u.countryEn||"",keywords:Array.isArray(u.keywords)?u.keywords.join(" "):u.keywords||""})),decorations:(l.decorations||[]).map(u=>({id:u.id,tags:Array.isArray(u.tags)?u.tags.join(" "):u.tags||"",placement:u.placement||"bottom-left"}))}:null,d=await fetch(`${this.baseUrl}/magic/create`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:s.userId||"web_user",prompt:e,options:{lang:i?"he":"en",availableBackgrounds:a,availableCoverElements:c},photos:n.map((u,g)=>{const m=u._visionAnalysis||window.photoQualityService?.analysisCache?.get(u.id);return{id:u.id,url:null,thumbnailUrl:null,rawBaseUrl:null,name:u.name,width:u.width,height:u.height,date:u.date,location:u.location,index:g,scene:m?.sceneType||null,mood:m?.mood||null,description:m?.description_he||null,hasPeople:m?.hasPeople||!1,qualityScore:m?.qualityScore||null,exifLocation:m?.exifLocation?.displayName||null,exifCountry:m?.exifLocation?.country||null,exifCity:m?.exifLocation?.city||null,exifDate:m?.exifDate||null,exifCoords:m?.exifCoords||null}}),max_pages:s.maxPages||20,photos_per_page:s.photosPerPage||4,include_ai_backgrounds:s.includeAiBackgrounds!==!1,include_decorative_text:s.includeDecorativeText!==!1})});if(!d.ok){let u=`Failed: ${d.status} ${d.statusText}`;try{const g=await d.json();u=g.detail||g.error||u}catch{console.warn("[MagicCreate v4] Non-JSON error response (possibly 504 timeout):",d.status)}throw new Error(u)}const p=await d.json();p.pages&&(p.pages.forEach((u,g)=>{if(!u.backgroundTextureId&&!u.background){const m=["soft-sunset","paper-cream","mint-fresh","lavender-mist","pure-zen","watercolor-mesh"];u.background=m[g%m.length]}else u.backgroundTextureId&&!u.background&&(u.background=u.backgroundTextureId);if(u.elementCategories&&u.elementCategories.length>0&&window.ELEMENTS_LIBRARY){const m=u.elementCategories.includes("flags"),y=u.elementCategories.filter(b=>b!=="flags");u.elements||(u.elements=[]);const w=[{x:5,y:5},{x:80,y:5},{x:5,y:80},{x:80,y:80}];if(y.length>0){const b=window.ELEMENTS_LIBRARY.filter(v=>y.includes(v.category));if(b.length>0){const v=b[Math.floor(Math.random()*b.length)],S=w[g%w.length];u.elements.push({id:"elem_auto_"+Date.now()+"_"+g,type:"element",url:v.url,x:S.x,y:S.y,pixelWidth:"80px",pixelHeight:"80px",zIndex:15})}}if(m){const b=window.ELEMENTS_LIBRARY.filter(f=>f.category==="flags");let v=null;const S=(p.cover?.title||"")+" "+(p.cover?.subtitle||"")+" "+(window._magicPrompt||"");for(const f of b)if([f.countryNameEn?.toLowerCase(),f.countryNameHe].filter(Boolean).some(C=>S.toLowerCase().includes(C.toLowerCase()))){v=f;break}if(!v&&b.length>0&&(v=b[Math.floor(Math.random()*b.length)]),v){const f=w[(g+1)%w.length];u.elements.push({id:"flag_auto_"+Date.now()+"_"+g,type:"element",url:v.url,x:f.x,y:f.y,pixelWidth:"100px",pixelHeight:"67px",zIndex:16})}}}}),p.cover&&p.cover.backgroundTextureId&&(p.theme||(p.theme={}),p.theme.coverId=p.cover.backgroundTextureId),console.log("[MagicCreate v4] AI-driven design applied. Backgrounds:",p.pages.map(u=>u.background||u.backgroundTextureId).filter(Boolean)));try{const{generateQRsFromPrompt:u}=await ne(async()=>{const{generateQRsFromPrompt:y}=await import("./qr-generator-DCRzgc9V.js");return{generateQRsFromPrompt:y}},[]),{urls:g,elements:m}=await u(e,p.pages?.length||0);m.length>0&&p.pages&&(console.log(`[MagicCreate v4] Auto-adding ${m.length} QR codes for URLs:`,g),m.forEach((y,w)=>{const b=Math.min(w,p.pages.length-1),v=p.pages[b];v.elements||(v.elements=[]),v.elements.push(y)}))}catch(u){console.warn("[MagicCreate v4] QR auto-detection failed (non-critical):",u)}return console.log("[MagicCreate v4] Created",p.pages?.length,"pages"),this.loadIntoEditor(p,o),this.hideProgress(),p}catch(r){throw this.hideProgress(),console.error("[MagicCreate v4] Create error:",r),r}}showReviewDialog(e,t,o){const{valid_photos:s,trash_photos:n}=e,r=document.createElement("div");r.className="mc4-modal",r.innerHTML=`
            <div class="mc4-modal-content">
                <div class="mc4-header">
                    <h2>📸 בדיקת איכות תמונות</h2>
                    <p>מצאנו <strong>${n.length}</strong> תמונה/ות שעשויות לא להיראות טוב:</p>
                </div>
                
                <div class="mc4-trash-grid">
                    ${n.map(a=>`
                        <div class="mc4-trash-item" data-id="${a.id}">
                            <div class="mc4-thumb">
                                <img src="${a.url}" alt="Photo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22>?</text></svg>'">
                                <span class="mc4-badge mc4-badge-${a.reason}">${this.formatReason(a.reason)}</span>
                            </div>
                            <div class="mc4-details">
                                <p>${a.details}</p>
                                <label class="mc4-keep">
                                    <input type="checkbox" data-photo-id="${a.id}">
                                    <span>כלול בכל זאת</span>
                                </label>
                            </div>
                        </div>
                    `).join("")}
                </div>
                
                <div class="mc4-summary">
                    <span class="mc4-count">
                        <strong id="mc4-photo-count">${s.length}</strong> תמונות יכללו באלבום
                    </span>
                </div>
                
                <div class="mc4-actions">
                    <button class="mc4-btn mc4-btn-cancel" id="mc4-cancel">ביטול</button>
                    <button class="mc4-btn mc4-btn-confirm" id="mc4-confirm">
                        ✨ צור אלבום
                    </button>
                </div>
            </div>
        `,document.body.appendChild(r);const i=()=>{const a=r.querySelectorAll('input[type="checkbox"]:checked').length;r.querySelector("#mc4-photo-count").textContent=s.length+a};r.querySelectorAll('input[type="checkbox"]').forEach(a=>{a.addEventListener("change",i)}),r.querySelector("#mc4-cancel").addEventListener("click",()=>{r.remove(),o()}),r.querySelector("#mc4-confirm").addEventListener("click",()=>{const a=s.map(c=>c.id),l=Array.from(r.querySelectorAll("input:checked")).map(c=>c.dataset.photoId);r.remove(),t([...a,...l])}),r.addEventListener("click",a=>{a.target===r&&(r.remove(),o())})}formatReason(e){return{blurry:"🔍 מטושטש",too_dark:"🌑 חשוך מדי",too_bright:"☀️ בהיר מדי",duplicate:"👯 כפול",low_quality:"⚠️ איכות נמוכה"}[e]||e}loadIntoEditor(e,t=[]){if(e.theme?.colors){const L=document.documentElement;Object.entries(e.theme.colors).forEach(([_,R])=>{L.style.setProperty(`--theme-${_}`,R)})}if(window.store&&e.pages){window._magicPages=null,window._magicCover=null;let L=null,_=null;const R=[],$=e.designPersonality||"magazine",B=window.DESIGN_PERSONALITIES?.[$]||window.DESIGN_PERSONALITIES?.magazine||null,Y=String(Date.now());let ae=0;console.log(`[MagicCreate v4] Design personality: ${$}`,B?"✓":"(no library)"),e._sessionDNA=B,e.pages.forEach(F=>{F.id||(F.id=crypto.randomUUID());const M=F.templateId==="cover"||F.id&&F.id.startsWith("page_cover_"),z=F.templateId==="back-cover"||F.id&&F.id.startsWith("page_backcover_"),W={single:[{x:10,y:10,width:80,height:80}],"two-vertical":[{x:10,y:5,width:80,height:43},{x:10,y:52,width:80,height:43}],"two-horizontal":[{x:5,y:15,width:43,height:70},{x:52,y:15,width:43,height:70}],"three-left":[{x:5,y:5,width:55,height:90},{x:63,y:5,width:32,height:43},{x:63,y:52,width:32,height:43}],"three-right":[{x:10,y:5,width:80,height:50},{x:10,y:58,width:38,height:37},{x:52,y:58,width:38,height:37}],"four-grid":[{x:5,y:5,width:43,height:43},{x:52,y:5,width:43,height:43},{x:5,y:52,width:43,height:43},{x:52,y:52,width:43,height:43}],"collage-5":[{x:5,y:5,width:43,height:43},{x:52,y:5,width:43,height:43},{x:5,y:52,width:43,height:43},{x:52,y:52,width:20,height:20},{x:75,y:52,width:20,height:20}],"collage-6":[{x:5,y:5,width:30,height:40},{x:38,y:5,width:24,height:40},{x:65,y:5,width:30,height:40},{x:5,y:50,width:30,height:40},{x:38,y:50,width:24,height:40},{x:65,y:50,width:30,height:40}]};if(typeof F.layout=="string"){const q=F.layout,N=W[q]||W.single;F.layout={id:q,slots:N.map(D=>({...D}))},console.log(`[MagicCreate v4] Resolved layout string "${q}" → ${F.layout.slots.length} slots`)}if(F.photoShape&&!F.imageShape&&(F.imageShape=F.photoShape),!F.photos&&F.layout&&F.layout.slots){const q=t&&t.length>0?t:window.store.state.assets?.photos||[],N=[],D=W[F.layout.id]||W.single;F.layout.slots.forEach((A,j)=>{if(A.width===void 0){const H=D[j]||D[0];A.x=H.x,A.y=H.y,A.width=H.width,A.height=H.height}if(A.photoId){const H=q.find(V=>V.id==A.photoId);H&&N.push(H)}}),F.photos=N}const X=F.templateId==="cover"||F.id&&F.id.startsWith("page_cover_"),O=F.templateId==="back-cover"||F.id&&F.id.startsWith("page_backcover_");if(!X&&!O&&F.layout?.slots){const q=F.layout.slots.filter(N=>N.photoId);if(q.length>=1){const N=t&&t.length>0?t:window.store?.state?.assets?.photos||[],D=q.map(A=>{const j=N.find(H=>H.id==A.photoId);return{id:A.photoId,width:j?.width||0,height:j?.height||0}});it(F,D,B,ae,Y),ae++}}if(!X&&!O&&F.photos&&F.photos.length>0){const q=[];let N=null,D=null;if(F.photos.forEach(A=>{if(!A)return;const j=A._visionAnalysis||window.photoQualityService?.analysisCache?.get(A.id);if(j){if(j.description_he){let H=j.description_he.replace(/\s*\([^)]*\)\s*$/,"");q.push(H)}!N&&j.exifLocation?.displayName&&(N=j.exifLocation.displayName),!D&&j.exifDate&&(D=j.exifDate)}}),q.length>0&&(F._pendingCaptions||(F._pendingCaptions={}),F._pendingCaptions.descriptions=q,F._pendingCaptions.location=N,F._pendingCaptions.date=D),N&&window.ELEMENTS_LIBRARY&&window.ELEMENTS_LIBRARY.length>0){const A=N.toLowerCase();if(A.includes("ישראל")||A.includes("israel")){const H=window.ELEMENTS_LIBRARY.filter(V=>V.category==="israel");if(H.length>0){F.elements||(F.elements=[]);const V=H[Math.floor(Math.random()*H.length)];F.elements.push({id:"deco_loc_"+Date.now()+"_"+Math.random().toString(36).substr(2,4),type:"element",url:V.url,x:82,y:5,width:12,height:12,opacity:.35,zIndex:15})}}}}M&&!L?L=F:z&&!_?_=F:R.push(F)});var o=R.filter(function(F){return F._pendingCaptions});if(o.length>0){var s=window.geminiService?window.geminiService.apiKey:null;if(s){console.log("[MagicCreate v4] 📝 Scheduling",o.length,"pages for AI captions...");var n=o.map(function(F,M){var z=F._pendingCaptions,W=z.descriptions.join(" | "),X=z.location?" [מיקום: "+z.location+"]":"",O=z.date?" [תאריך: "+z.date+"]":"";return"עמוד "+(M+1)+": "+W+X+O}).join(`
`),r=`אתה מעצב אלבומי תמונות יוקרתיים. עבור כל עמוד, צור כיתוב קצר בעברית (עד 40 תווים!) שיופיע באלבום.
הכיתוב חייב להיות יצירתי — מצחיק, מעורר השראה, פואטי, נוסטלגי או רומנטי. לא תיאור יבש!
אם יש מיקום, שלב אותו בצורה אלגנטית. קצר! מקסימום 40 תווים.
דוגמאות: "הרגעים שלא נשכח", "ירושלים של זהב שלנו", "חיוכים בלי סוף", "הים השמש ואנחנו"

תיאורי העמודים:
`+n+`

החזר JSON בלבד: [{"page": 1, "caption": "טקסט"}, ...]`,i="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key="+s,a=JSON.stringify({contents:[{parts:[{text:r}]}],generationConfig:{temperature:.8,maxOutputTokens:2048}});fetch(i,{method:"POST",headers:{"Content-Type":"application/json"},body:a}).then(function(F){return F.ok?F.json():null}).then(function(F){if(F){var M="";try{M=F.candidates[0].content.parts[0].text}catch{return}var z=M,W=M.match(/```json\n?([\s\S]*?)\n?```/);W&&(z=W[1]);var X=z.match(/\[[\s\S]*\]/);X&&(z=X[0]);var O=JSON.parse(z);console.log("[MagicCreate v4] ✅ AI captions received:",O.length);for(var q=0;q<O.length;q++){var N=O[q],D=(N.page||1)-1,A=o[D];if(!(!A||!N.caption)){A.elements||(A.elements=[]);var j=A._pendingCaptions?A._pendingCaptions.location:null,H=A._pendingCaptions?A._pendingCaptions.date:null,V="";j&&(V+="📍 "+j),H&&(V+=(V?" · ":"")+H);var te=B&&B.captionY!=null?B.captionY:85,ge=B&&B.captionBg?B.captionBg:"rgba(0,0,0,0.40)",fe=B&&B.captionTextColor?B.captionTextColor:"#ffffff",Se=B&&B.captionStyle&&B.captionStyle.fontSize?B.captionStyle.fontSize:13,De=V?13:8,K=te<50;if(ge!=="transparent"&&ge!=="rgba(255,255,255,0.0)"&&A.elements.push({id:"cap_bg_"+Math.random().toString(36).substr(2,6),type:"shape",shape:"rect",x:K?0:4,y:te,width:K?100:92,height:De,color:ge,borderRadius:K?0:6,zIndex:18}),A.elements.push({id:"cap_txt_"+Math.random().toString(36).substr(2,6),type:"text",content:N.caption,x:K?3:7,y:te+(K?1:1.5),width:K?70:86,fontSize:Se,fontWeight:"bold",color:fe,textAlign:K?"right":"center",fontFamily:"'Heebo', sans-serif",textShadow:fe==="#ffffff"?"0 1px 3px rgba(0,0,0,0.5)":"none",zIndex:19}),V){var Re=K?te+Se*.15+4:te+7;A.elements.push({id:"cap_sub_"+Math.random().toString(36).substr(2,6),type:"text",content:V,x:K?3:7,y:Re,width:K?70:86,fontSize:9,color:fe==="#ffffff"?"rgba(255,255,255,0.75)":"rgba(0,0,0,0.55)",textAlign:K?"right":"center",fontFamily:"'Heebo', sans-serif",zIndex:19})}}}window.app&&window.app.renderActivePage&&window.app.renderActivePage()}}).catch(function(F){console.warn("[MagicCreate v4] AI caption error:",F.message)})}for(var l=0;l<o.length;l++)delete o[l]._pendingCaptions}if(window.app&&(window.app.magicCreateGenerationStarted=!0,window.app._magicCreateRendering=!0),window.store){const F=window.store._target;F||console.error("[MagicCreate v4] store._target not available! Falling back to Proxy.");const M=F||window.store.state;if(M.pages=R,console.log("[MagicCreate v4] Pages set (direct target):",R.length,"pages. First:",R[0]?.id),R.length>0&&(M.activePageId=R[0].id),M.viewMode="pages",e.theme&&(M.theme=e.theme),L){console.log("[MagicCreate v4] Setting cover (direct target). background:",L.background);const z={...M.cover||{},...L,background:L.background||L.theme||M.cover?.background,theme:L.theme||L.background||M.cover?.theme};L.backgroundElementId&&(z.backgroundElementId=L.backgroundElementId),L.coverDecorations&&L.coverDecorations.length>0&&(z.coverDecorations=L.coverDecorations),L.colorPaletteId&&(z.colorPaletteId=L.colorPaletteId),B&&(z._personalityCoverStyle=B.coverStyle||"full-bleed",z._personalityTextColor=B.textColor||null,z._personalityId=B.id),M.cover=z,console.log("[MagicCreate v4] Cover verify:",JSON.stringify({background:z.background,theme:z.theme,title:z.title,readback:window.store.state.cover?.background,targetReadback:M.cover?.background}))}if(_&&(console.log("[MagicCreate v4] Back cover set:",_.id,"bg:",_.background),M.backCover=_),e.cover&&(M.coverData=e.cover),e.backCover&&(M.backCoverData=e.backCover),window.COVER_GALLERY&&window.COVER_GALLERY.length>0){const z=[],W=window.store?.state?.assets?.photos||[];W.forEach(q=>{const N=q._visionAnalysis||window.photoQualityService?.analysisCache?.get(q.id);if(N?.exifLocation){const D=N.exifLocation;D.city&&z.push(D.city),D.country&&z.push(D.country),D.countryCode&&z.push(D.countryCode)}});const X=[window._magicPrompt||"",M.cover?.title||"",M.cover?.subtitle||"",e.cover?.title||"",e.cover?.subtitle||"",...z].join(" ").toLowerCase();let O=null;for(const q of window.COVER_GALLERY)if(q.keywords&&q.keywords.some(N=>X.includes(N.toLowerCase()))){O=q;break}if(O){const q="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(O.svg);var c={},d={},p=[];W.forEach(function(D){var A=D._visionAnalysis||(window.photoQualityService&&window.photoQualityService.analysisCache?window.photoQualityService.analysisCache.get(D.id):null);if(A&&A.exifLocation&&(A.exifLocation.city&&(c[A.exifLocation.city]=(c[A.exifLocation.city]||0)+1),A.exifLocation.country&&(d[A.exifLocation.country]=(d[A.exifLocation.country]||0)+1)),A&&A.exifDate&&p.push(A.exifDate),A&&A.exifLocation&&A.exifLocation.displayName&&!A.exifLocation.city){var j=A.exifLocation.displayName.split(",")[0].trim();j&&(c[j]=(c[j]||0)+1)}});var u=Object.entries(c).sort(function(D,A){return A[1]-D[1]})[0];u=u?u[0]:null;var g=Object.entries(d).sort(function(D,A){return A[1]-D[1]})[0];g=g?g[0]:null,console.log("[MagicCreate v4] Cover EXIF data:",{realCity:u,realCountry:g,dateCount:p.length,dates:p.slice(0,3)});var m=new Date().getFullYear().toString();if(p.length>0){var y=["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"],w=["January","February","March","April","May","June","July","August","September","October","November","December"],b=p.map(function(D){var A=String(D).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(A)return new Date(parseInt(A[3]),parseInt(A[2])-1,parseInt(A[1]));var j=String(D).match(/(\d{4}):(\d{2}):(\d{2})/);return j?new Date(parseInt(j[1]),parseInt(j[2])-1,parseInt(j[3])):new Date(D)}).filter(function(D){return!isNaN(D.getTime())}).sort(function(D,A){return D-A});if(console.log("[MagicCreate v4] Parsed dates:",b.length,b.length>0?b[0].toISOString()+" to "+b[b.length-1].toISOString():"none"),b.length>0){var v=window._magicIsHebrew,S=v?y:w,f=b[0],x=b[b.length-1];f.getMonth()===x.getMonth()&&f.getFullYear()===x.getFullYear()?m=S[f.getMonth()]+" "+f.getFullYear():f.getFullYear()===x.getFullYear()?m=S[f.getMonth()]+"-"+S[x.getMonth()]+" "+f.getFullYear():m=S[f.getMonth()]+" "+f.getFullYear()+" - "+S[x.getMonth()]+" "+x.getFullYear()}}var C=u||O.cityEn;u&&g&&u!==g&&(C=u);const N=M.cover?.frontPhotoId;M.cover={...M.cover||{},title:C,subtitle:m,textColor:O.textColor,color:O.bgColor,theme:q,background:q,_coverGalleryId:O.id,_backSvgDataUri:O.backSvg?"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(O.backSvg):void 0,frontPhotoId:null},M.cover.backgroundElementId="cbg-"+O.id.replace("cover-","");var I=window.COVER_ELEMENT_LIBRARY&&window.COVER_ELEMENT_LIBRARY.decorations?window.COVER_ELEMENT_LIBRARY.decorations:[],E=[];if(I.find(function(D){return D.id==="cdec-location-pin"})&&E.push({id:"cdec-location-pin"}),g){var T=g.toLowerCase(),k=I.find(function(D){return D.id.startsWith("cdec-flag-")&&Array.isArray(D.tags)&&D.tags.some(function(A){return T.includes(A.toLowerCase())})});k&&E.push({id:k.id})}M.cover.coverDecorations=E,N&&!M.cover.backPhotoId&&(M.cover.backPhotoId=N),M.cover.textContent||(M.cover.textContent={}),M.cover.textContent.title=C,M.cover.textContent.date=m,M.cover.textContent.subtitle=m,console.log("[MagicCreate v4] 🌍 Travel cover:",O.id,"| Title:",C,"| Date:",m,"| Decorations:",E.map(function(D){return D.id}).join(","))}}window._magicCover={...M.cover},window._magicPages=R,console.log("[MagicCreate v4] STATE VERIFY (via Proxy):",JSON.stringify({pagesCount:window.store.state.pages?.length,firstPageId:window.store.state.pages?.[0]?.id,coverBg:window.store.state.cover?.background,activePageId:window.store.state.activePageId})),console.log("[MagicCreate v4] STATE VERIFY (via _target):",JSON.stringify({pagesCount:M.pages?.length,firstPageId:M.pages?.[0]?.id,coverBg:M.cover?.background,activePageId:M.activePageId}))}if(window.app&&(window.app._magicCreateRendering=!1),window.app){if(console.log("[MagicCreate v4] Explicitly forcing UI update. ActivePage:",window.store?.state?.activePageId),window.store&&t&&t.length>0)if(window.store.state.assets||(window.store.state.assets={photos:[]}),!window.store.state.assets.photos||window.store.state.assets.photos.length===0)console.log("[MagicCreate v4] Restoring",t.length,"photos to store.state.assets"),window.store.state.assets.photos=t;else{const W=new Set(window.store.state.assets.photos.map(O=>O.id)),X=t.filter(O=>!W.has(O.id));X.length>0&&(console.log("[MagicCreate v4] Adding",X.length,"missing photos to store.state.assets"),window.store.state.assets.photos.push(...X))}const F=window.store.state.assets||{photos:t||[]};console.log("[MagicCreate v4] Assets available for render:",F.photos?.length,"photos"),window._magicAssets={photos:[...F.photos||[]]},window.app.updateTimeline&&window.app.updateTimeline(R,R.length>0?R[0].id:null);const M=R[0];if(M&&window.app.renderer){const W=document.getElementById("canvas-container");W&&(console.log("[MagicCreate v4] Direct render of page",M.id,"to canvas-container"),window.app.renderer.renderPageToContainer(M,F,W,null))}window.app.saveDebounced&&window.app.saveDebounced(window.store.state);const z=window.store.state.cover;console.log("[MagicCreate v4] POST-RENDER cover verification:",JSON.stringify({background:z?.background,theme:z?.theme,title:z?.title}))}console.log("[MagicCreate v4] UI Fully Rendered. Pages:",R.length,"Active:",window.store?.state?.activePageId)}this.showToast(`✨ נוצרו ${e.pages?e.pages.length:0} עמודים!`)}showProgress(e="initializing"){this._progressInterval&&(clearInterval(this._progressInterval),this._progressInterval=null);let t=document.querySelector(".mc4-progress");t||(t=document.createElement("div"),t.className="mc4-progress",t.innerHTML=`
                <div class="mc4-magic-scene">
                    <div class="mc4-book">
                        <div class="mc4-page mc4-page-1"></div>
                        <div class="mc4-page mc4-page-2"></div>
                        <div class="mc4-page mc4-page-3"></div>
                    </div>
                    <div class="mc4-wand"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                    <div class="mc4-sparkles">
                        <span>✨</span><span>✨</span><span>✨</span>
                    </div>
                </div>
                <div class="mc4-status">
                    <h3>Magic Create</h3>
                    <p id="mc4-dynamic-msg">מאתחל...</p>
                </div>
            `,document.body.appendChild(t)),t.classList.remove("mc4-fade-out"),t.style.display="flex";const o=["🔍 מנתח את התמונות שלך...","⚖️ מחפש חיתוכים ונקודות מיקוד אופטימליות...","✨ חולם על נושא...","📐 מעצב פריסות אופטימליות...","🎨 מצייר רקעים מותאמים אישית...","✒️ כותב טקסטים דקורטיביים...","📚 מרכיב את האלבום שלך..."];let s=e==="analyzing"?0:2;const n=document.getElementById("mc4-dynamic-msg");n&&(n.innerText=e==="initializing"?"מאתחל...":o[s]),e!=="initializing"&&(this._progressInterval=setInterval(()=>{s=(s+1)%o.length;const r=document.getElementById("mc4-dynamic-msg");r&&(r.innerText=o[s])},3500))}hideProgress(){this._progressInterval&&(clearInterval(this._progressInterval),this._progressInterval=null);const e=document.querySelector(".mc4-progress");e&&(e.classList.add("mc4-fade-out"),setTimeout(()=>e.remove(),500))}showToast(e,t=3e3){const o=document.createElement("div");o.className="mc4-toast",o.innerHTML=`<i class="fa-solid fa-check-circle"></i> ${e}`,document.body.appendChild(o),setTimeout(()=>o.classList.add("mc4-toast-show"),10),setTimeout(()=>{o.classList.remove("mc4-toast-show"),setTimeout(()=>o.remove(),300)},t)}injectStyles(){if(document.querySelector("#mc4-styles"))return;const e=document.createElement("style");e.id="mc4-styles",e.textContent=`
            /* Modal & Shared */
            .mc4-modal {
                position: fixed;
                inset: 0;
                background: rgba(10, 10, 15, 0.9);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
                animation: mc4-fadeIn 0.3s ease;
                font-family: 'Rubik', sans-serif;
            }
            @keyframes mc4-fadeIn { from { opacity: 0; } to { opacity: 1; } }
            
            .mc4-modal-content {
                background: linear-gradient(135deg, #13131f 0%, #1e1e2e 100%);
                border-radius: 20px;
                padding: 30px;
                max-width: 800px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                color: #fff;
                box-shadow: 0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1);
                border: 1px solid rgba(139, 92, 246, 0.2);
            }

            /* Animations */
            .mc4-progress {
                position: fixed;
                inset: 0;
                background: radial-gradient(circle at center, #1e1e2e 0%, #0f0f16 100%);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 100001;
                color: #fff;
            }
            .mc4-fade-out {
                 opacity: 0;
                 transition: opacity 0.5s ease;
                 pointer-events: none;
            }

            .mc4-magic-scene {
                position: relative;
                width: 200px;
                height: 200px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .mc4-book {
                position: relative;
                width: 80px;
                height: 100px;
                background: #333;
                border-radius: 2px 6px 6px 2px;
                box-shadow: inset 4px 0 10px rgba(0,0,0,0.5);
                transform-style: preserve-3d;
                perspective: 600px;
            }
            .mc4-book::before {
                content: '';
                position: absolute;
                left: 0; top: 0; bottom: 0; width: 8px;
                background: #111;
                border-radius: 2px 0 0 2px;
            }

            .mc4-page {
                position: absolute;
                top: 2px; bottom: 2px; right: 2px; width: 68px;
                background: #fff;
                transform-origin: left;
                animation: mc4-flipPage 2s infinite ease-in-out;
                border: 1px solid #ddd;
            }
            .mc4-page-1 { animation-delay: 0s; }
            .mc4-page-2 { animation-delay: 0.4s; }
            .mc4-page-3 { animation-delay: 0.8s; }

            @keyframes mc4-flipPage {
                0% { transform: rotateY(0deg); opacity: 1; }
                50% { transform: rotateY(-160deg); opacity: 0.8; }
                100% { transform: rotateY(0deg); opacity: 0; }
            }

            .mc4-wand {
                position: absolute;
                top: 20px;
                right: 20px;
                font-size: 40px;
                background: linear-gradient(45deg, #a855f7, #ec4899);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: mc4-waveWand 2s infinite ease-in-out;
                filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.5));
            }
            @keyframes mc4-waveWand {
                0% { transform: rotate(0deg) translate(0,0); }
                50% { transform: rotate(-20deg) translate(-10px, 10px); }
                100% { transform: rotate(0deg) translate(0,0); }
            }

            .mc4-sparkles span {
                position: absolute;
                font-size: 20px;
                animation: mc4-sparkleFloat 1.5s infinite linear;
                opacity: 0;
            }
            .mc4-sparkles span:nth-child(1) { top: 40px; right: 60px; animation-delay: 0.2s; }
            .mc4-sparkles span:nth-child(2) { top: 80px; right: 30px; animation-delay: 0.5s; font-size: 15px; }
            .mc4-sparkles span:nth-child(3) { top: 60px; right: 80px; animation-delay: 0.8s; font-size: 12px; }

            @keyframes mc4-sparkleFloat {
                0% { transform: translateY(0) scale(0); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: translateY(-20px) scale(1.5); opacity: 0; }
            }

            .mc4-status {
                margin-top: 20px;
                text-align: center;
            }
            .mc4-status h3 {
                margin: 0;
                font-size: 24px;
                background: linear-gradient(90deg, #fff, #a855f7);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .mc4-status p {
                margin: 8px 0 0;
                color: #888;
                font-size: 14px;
            }

            /* Toast */
            .mc4-toast {
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                background: rgba(16, 16, 24, 0.95);
                border: 1px solid rgba(168, 85, 247, 0.3);
                color: #fff;
                padding: 16px 32px;
                border-radius: 50px;
                font-weight: 500;
                font-size: 16px;
                z-index: 100002;
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .mc4-toast i { color: #4ade80; }
            .mc4-toast-show { transform: translateX(-50%) translateY(0); }
            /* Trash Grid (Review Dialog) & Actions */
            .mc4-trash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; margin: 24px 0; }
            .mc4-trash-item { background: rgba(255,255,255,0.05); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); transition: transform 0.2s, border-color 0.2s; }
            .mc4-trash-item:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.15); }
            .mc4-thumb { position: relative; height: 120px; background: #000; }
            .mc4-thumb img { width: 100%; height: 100%; object-fit: cover; }
            .mc4-badge { position: absolute; top: 8px; left: 8px; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .mc4-badge-blurry { background: linear-gradient(135deg, #e74c3c, #c0392b); }
            .mc4-badge-too_dark { background: linear-gradient(135deg, #2c3e50, #1a252f); }
            .mc4-badge-too_bright { background: linear-gradient(135deg, #f39c12, #d68910); }
            .mc4-badge-duplicate { background: linear-gradient(135deg, #9b59b6, #8e44ad); }
            .mc4-badge-low_quality { background: linear-gradient(135deg, #e67e22, #d35400); }
            .mc4-details { padding: 12px; }
            .mc4-details p { margin: 0 0 10px 0; font-size: 12px; opacity: 0.7; line-height: 1.4; }
            .mc4-keep { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; padding: 6px 0; }
            .mc4-keep input { width: 18px; height: 18px; cursor: pointer; accent-color: #a855f7; }
            .mc4-summary { text-align: center; padding: 12px; background: rgba(168, 85, 247, 0.15); border-radius: 10px; margin-bottom: 20px; border: 1px solid rgba(168, 85, 247, 0.2); }
            .mc4-count { font-size: 15px; }
            .mc4-actions { display: flex; gap: 12px; justify-content: flex-end; }
            .mc4-btn { padding: 12px 24px; border-radius: 10px; border: none; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; }
            .mc4-btn-cancel { background: rgba(255,255,255,0.1); color: #fff; }
            .mc4-btn-cancel:hover { background: rgba(255,255,255,0.15); }
            .mc4-btn-confirm { background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: #fff; }
            .mc4-btn-confirm:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4); }
        `,document.head.appendChild(e)}}window.MagicCreateV4=at;class rt{constructor(){this.listeners=new Set,this.history=[],this.historyIndex=-1,this.maxHistory=50,this._isBatchUpdating=!1;const e=this.getInitialState();this._target=e,this.state=new Proxy(e,{get:(t,o)=>t[o],set:(t,o,s)=>(t[o]=s,this._isBatchUpdating||this.notify(o,s),!0)})}getInitialState(){return{activePageId:null,pages:[],assets:{photos:[],designs:[],backgrounds:[],frames:[],textStyles:[]},selection:null,theme:"classic",cover:{layout:"standard",title:"My Photo Book",subtitle:"2025",spineText:"My Photo Book",frontPhotoId:null,backPhotoId:null,theme:"classic",textColor:"#000000"},viewMode:"pages"}}reset(){const e=this.getInitialState();Object.keys(this.state).forEach(t=>{t!=="user"&&delete this.state[t]}),this._isBatchUpdating=!0,Object.assign(this.state,e),this._isBatchUpdating=!1,this.history=[],this.historyIndex=-1,console.log("[Store] State reset to initial."),this.notify("reset",null)}pushState(e="Unknown Action"){const t=Date.now();if(this._lastPushAction===e&&t-(this._lastPushTime||0)<300)return;this._lastPushAction=e,this._lastPushTime=t,this.historyIndex<this.history.length-1&&(this.history=this.history.slice(0,this.historyIndex+1));let o;try{const s=n=>{try{return structuredClone(n)}catch{}return JSON.parse(JSON.stringify(n))};if(o={pages:s(this.state.pages||[]),cover:s(this.state.cover||{}),theme:this.state.theme},o.pages){for(const n of o.pages)if(n.photos&&Array.isArray(n.photos))for(const r of n.photos)r&&r.url&&r.url.startsWith("data:")&&(r.url=r.url.substring(0,100)+"...[base64]")}}catch{return}this.history.push({name:e,timestamp:t,snapshot:o}),this.history.length>this.maxHistory?this.history.shift():this.historyIndex++}undo(){this.historyIndex>0?(this.historyIndex--,this.restoreState(this.history[this.historyIndex]),console.log(`[Store] Undid to state index ${this.historyIndex}`)):console.warn("[Store] Nothing to undo")}redo(){this.historyIndex<this.history.length-1?(this.historyIndex++,this.restoreState(this.history[this.historyIndex]),console.log(`[Store] Redid to state index ${this.historyIndex}`)):console.warn("[Store] Nothing to redo")}restoreState(e){if(!e||!e.snapshot)return;const t=e.snapshot;this._isBatchUpdating=!0;const o=s=>{if(typeof structuredClone=="function")try{return structuredClone(s)}catch{}return JSON.parse(JSON.stringify(s))};t.pages&&(this.state.pages=o(t.pages),!this.state.pages.find(s=>s.id===this.state.activePageId)&&this.state.pages.length>0&&(this.state.activePageId=this.state.pages[0].id)),t.cover&&(this.state.cover=o(t.cover)),t.assets&&(this.state.assets=o(t.assets)),t.theme&&(this.state.theme=t.theme),this._isBatchUpdating=!1,this.notify("history_restore",null)}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}notify(e,t){if(e==="pages"&&window._magicPages&&window._magicPages.length>1){const o=this._target.pages;!o||o.length<=1?this._target.pages=window._magicPages:o.length===1&&o[0]?.id&&!o[0].id.startsWith("page_")&&(this._target.pages=window._magicPages)}if(e==="cover"&&window._magicCover&&window._magicCover.background){const o=this._target.cover;o&&o.theme==="classic"&&o.background===void 0&&window._magicCover.theme!=="classic"&&(this._target.cover={...window._magicCover})}this.listeners.forEach(o=>o(this.state,e,t))}addPage(){const e={id:crypto.randomUUID(),layout:{id:"single",slots:[{x:10,y:10,width:80,height:80}]},elements:[],background:this.state.theme};this.state.pages=[...this.state.pages,e],this.state.activePageId=e.id}setTheme(e){this.state.theme=e,this.state.pages=this.state.pages.map(t=>({...t,background:e})),this.state.cover&&(this.state.cover.theme=e),this.notify("theme",e),this.notify("pages",this.state.pages),this.notify("cover",this.state.cover)}}const h=new rt;window.store=h;class lt{constructor(){this.modalId="magic-create-v2-modal",this.initialized=!1}init(){this.initialized||(this.injectModal(),this.initialized=!0)}injectModal(){if(document.getElementById(this.modalId))return;const e=`
        <div id="${this.modalId}" class="md-modal-overlay">
            <div class="ml-card">
                <!-- Decorations -->
                <div class="ml-orb ml-orb-1"></div>
                <div class="ml-orb ml-orb-2"></div>
                
                <div id="magic-launcher-start">
                    <div class="ml-header">
                        <div class="ml-icon-wrapper">
                            <i class="fa-solid fa-wand-magic-sparkles"></i>
                        </div>
                        <h2>יצירת קסם</h2>
                        <p>תן ל-AI לטוות את התמונות שלך לסיפור.</p>
                    </div>

                    <div class="ml-input-group">
                        <label>מה האווירה של האלבום הזה?</label>
                        <div class="ml-textarea-wrapper">
                            <textarea id="magic-prompt-input" 
                                placeholder="לדוגמה חתונת יער קסומה עם גוונים ירוקים רכים..." style="text-align: right;" dir="rtl"></textarea>
                            <i class="fa-solid fa-pen-fancy ml-input-icon"></i>
                        </div>
                        <div class="ml-hints">
                            <span>דוגמאות:</span>
                            <button onclick="document.getElementById('magic-prompt-input').value='שקיעה רומנטית בחוף'">חוף ים</button>
                            <button onclick="document.getElementById('magic-prompt-input').value='אדריכלות מודרנית ומינימליסטית'">מודרני</button>
                            <button onclick="document.getElementById('magic-prompt-input').value='היסטוריה משפחתית בסגנון וינטג'">וינטג'</button>
                        </div>
                    </div>

                    <div class="ml-footer" style="flex-direction: row-reverse;">
                        <button class="ml-btn ml-btn-primary" onclick="magicLauncher.start()">
                            <span class="ml-btn-content">
                                <i class="fa-solid fa-stars"></i> צור אלבום
                            </span>
                            <div class="ml-btn-glow"></div>
                        </button>
                        <button class="ml-btn ml-btn-cancel" onclick="magicLauncher.close()">
                            ביטול
                        </button>
                    </div>
                </div>

                <!-- Progress State (Legacy - kept for fallback but usually hidden) -->
                <div id="magic-launcher-progress" style="display: none; text-align: center; color: white;">
                    <div class="spinner"></div>
                    <p>מאתחל...</p>
                    <div id="magic-log" style="display:none"></div>
                </div>
            </div>
            
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Playfair+Display:ital,wght@0,600;1,600&display=swap');

                .md-modal-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background-color: rgba(5, 5, 10, 0.85);
                    backdrop-filter: blur(12px);
                    display: none; align-items: center; justify-content: center;
                    z-index: 10001;
                    opacity: 0; transition: opacity 0.3s ease;
                }
                .md-modal-overlay.active { opacity: 1; }

                .ml-card {
                    position: relative;
                    width: 90%; max-width: 550px;
                    background: rgba(20, 20, 30, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 40px;
                    overflow: hidden;
                    box-shadow: 0 40px 100px rgba(0,0,0,0.6);
                    color: white;
                    font-family: 'Outfit', sans-serif;
                    transform: translateY(20px); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .md-modal-overlay.active .ml-card { transform: translateY(0); }

                /* Orbs */
                .ml-orb {
                    position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.4; z-index: -1;
                }
                .ml-orb-1 { width: 300px; height: 300px; background: #6366f1; top: -100px; left: -100px; animation: floatOrb 10s infinite ease-in-out; }
                .ml-orb-2 { width: 250px; height: 250px; background: #a855f7; bottom: -50px; right: -50px; animation: floatOrb 12s infinite ease-in-out reverse; }
                @keyframes floatOrb { 0% { transform: translate(0,0); } 50% { transform: translate(20px, 30px); } 100% { transform: translate(0,0); } }

                .ml-header { text-align: center; margin-bottom: 30px; }
                .ml-icon-wrapper {
                    width: 60px; height: 60px; margin: 0 auto 16px;
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    font-size: 24px; color: #a855f7;
                    box-shadow: 0 0 30px rgba(168, 85, 247, 0.3);
                }
                .ml-header h2 { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.5px; }
                .ml-header p { color: #9ca3af; font-size: 16px; margin: 0; font-weight: 300; }

                .ml-input-group label { display: block; font-size: 14px; font-weight: 600; color: #e5e7eb; margin-bottom: 12px; letter-spacing: 0.5px; text-transform: uppercase; }
                
                .ml-textarea-wrapper { position: relative; }
                .ml-textarea-wrapper textarea {
                    width: 100%; min-height: 100px;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 16px;
                    padding: 16px 16px 16px 44px;
                    color: white; font-family: 'Outfit', sans-serif; font-size: 16px;
                    resize: none; outline: none; transition: all 0.3s;
                }
                .ml-textarea-wrapper textarea:focus {
                    background: rgba(0,0,0,0.5); border-color: #8b5cf6;
                    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15);
                }
                .ml-input-icon {
                    position: absolute; top: 20px; left: 16px; color: #6b7280; pointer-events: none;
                }
                .ml-textarea-wrapper textarea:focus + .ml-input-icon { color: #8b5cf6; }

                .ml-hints { display: flex; gap: 8px; margin-top: 12px; align-items: center; }
                .ml-hints span { font-size: 12px; color: #6b7280; }
                .ml-hints button {
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 20px; padding: 4px 12px; color: #9ca3af; font-size: 12px; cursor: pointer; transition: all 0.2s;
                }
                .ml-hints button:hover { background: rgba(255,255,255,0.1); color: white; border-color: rgba(255,255,255,0.2); }

                .ml-footer { display: flex; gap: 16px; margin-top: 40px; }
                .ml-btn { flex: 1; padding: 14px; border-radius: 14px; border: none; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden; }
                .ml-btn-cancel { background: transparent; color: #9ca3af; border: 1px solid rgba(255,255,255,0.1); }
                .ml-btn-cancel:hover { background: rgba(255,255,255,0.05); color: white; }
                
                .ml-btn-primary {
                    background: linear-gradient(135deg, #6366f1, #a855f7); color: white;
                    box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
                }
                .ml-btn-primary:hover {
                    transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.5);
                }
                .ml-btn-glow {
                    position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%);
                    opacity: 0; transform: scale(0.5); transition: opacity 0.5s, transform 0.5s;
                }
                .ml-btn-primary:hover .ml-btn-glow { opacity: 1; transform: scale(1); transition: 0s; }

            </style>
        </div>
        `;document.body.insertAdjacentHTML("beforeend",e)}open(e){if(this.initialized||this.init(),!e||e.length===0){alert("אנא בחר מספר תמונות קודם!");return}this.selectedPhotos=e,document.getElementById("magic-launcher-start").style.display="block",document.getElementById("magic-launcher-progress").style.display="none",document.getElementById("magic-prompt-input").value="",document.getElementById(this.modalId).style.display="flex",document.getElementById(this.modalId).classList.add("active")}close(){document.getElementById(this.modalId).style.display="none",document.getElementById(this.modalId).classList.remove("active")}async start(){const e=document.getElementById("magic-prompt-input").value;document.getElementById("magic-launcher-start").style.display="none",document.getElementById("magic-launcher-progress").style.display="block";const t=document.getElementById("magic-log"),o=s=>{const n=document.createElement("div");n.textContent=`> ${s}`,t.appendChild(n),t.scrollTop=t.scrollHeight};try{o("Starting engine...");const s=new window.MagicCreateV4,n=h?.state?.assets?.photos?.length>0?h.state.assets.photos:this.selectedPhotos;this.close();const r=await s.run(e,n,{maxPages:50,photosPerPage:3,includeAiBackgrounds:!0,includeDecorativeText:!0});o("Album generation complete!")}catch(s){console.error(s),alert("יצירת קסם נכשלה: "+s.message),this.close()}}}const ct=new lt;window.magicLauncher=ct;const oe=typeof window<"u"&&(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"||window.location.search.includes("debug=true")),Z=()=>{};oe&&console.log.bind(console),oe&&console.warn.bind(console),oe&&console.debug.bind(console),console.error.bind(console),oe&&console.info.bind(console);if(!oe){const P=console.error.bind(console);window.__originalConsole={...console},console.log=Z,console.warn=Z,console.debug=Z,console.info=Z,console.error=P}function Ee(P,e,t,o){try{const s=P.naturalWidth,n=P.naturalHeight;if(!s||!n)return null;const r=e.clientWidth||1,i=e.clientHeight||1,a=Math.max(r/s,i/n),l=n*a,c=l-i;if(c<5)return null;const d=t.faces||[];if(d.length===0)return null;const u=(t.headTop??Math.min(...d.map(y=>y.headTop??Math.max(0,(y.centerY||50)-(y.height||25)/2-(y.height||25)*.35))))/100*l,g=Math.max(4,i*.03),m=(u-g)/c*100;return Math.max(0,Math.min(90,m))}catch{return null}}class Ce{constructor(e){this.container=document.getElementById(e)}renderPageToContainer(e,t,o,s=null){if(!e||!o){o&&(o.innerHTML='<div class="empty-message">No Page Selected</div>');return}o.innerHTML="";const n=document.createElement("div");n.className="shoso-page",e.templateId&&n.classList.add(e.templateId),n.dataset.pageId=e.id,n.style.width="100%",n.style.height="100%",n.style.position="relative",n.style.overflow="hidden",console.log(`[RenderEngine] Rendering page ${e.id} to container ${o.id||"preview"}. Layout:`,e.layout,"Background:",e.background);const r=window.BACKGROUND_TEXTURES?.find(i=>i.id===e.background);if(r)r.url.startsWith("http")||r.url.startsWith("assets")||r.url.startsWith("data:")?(n.style.backgroundImage=`url('${r.url}')`,n.style.backgroundSize="cover"):n.style.backgroundColor=r.url;else if(typeof e.background=="object"){const i=e.background;if(i.textureId){const a=window.BACKGROUND_TEXTURES?.find(l=>l.id===i.textureId);a&&(a.url.startsWith("http")||a.url.startsWith("assets")||a.url.startsWith("data:")?(n.style.backgroundImage=`url('${a.url}')`,n.style.backgroundSize="cover"):n.style.backgroundColor=a.url)}else if(i.type==="image"||i.imageUrl)n.style.backgroundImage=`url('${i.imageUrl}')`,n.style.backgroundSize="cover";else if(i.type==="ai_generated"&&i.ai_image_url)n.style.backgroundImage=`url('${i.ai_image_url}')`,n.style.backgroundSize="cover";else if(i.type==="gradient"&&i.gradient_colors){const a=i.gradient_angle||180;n.style.background=`linear-gradient(${a}deg, ${i.gradient_colors.join(", ")})`}else i.type==="pattern"&&i.pattern_name?n.style.backgroundColor=i.color||"#ffffff":i.color&&(n.style.backgroundColor=i.color)}else typeof e.background=="string"&&(e.background.startsWith("http")||e.background.startsWith("data:")?(n.style.backgroundImage=`url('${e.background}')`,n.style.backgroundSize="cover"):(e.background.startsWith("#")||e.background.startsWith("rgb"))&&(n.style.backgroundColor=e.background));if(e.templateId&&window.THEMED_PAGE_DESIGNS&&window.THEMED_PAGE_DESIGNS[e.templateId]){const i=window.THEMED_PAGE_DESIGNS[e.templateId];i.pageBg&&(n.style.background=i.pageBg);let a="";if(i.bgPattern&&(a+=`<div class="themed-bg-pattern" style="position:absolute;inset:0;pointer-events:none;z-index:0;">${i.bgPattern}</div>`),i.cornerSVG&&(a+=`<div class="themed-corners" style="position:absolute;inset:0;pointer-events:none;z-index:3;">${i.cornerSVG}</div>`),a){const l=document.createElement("div");l.className="themed-page-overlay",l.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:0;",l.innerHTML=a,n.appendChild(l)}}if(typeof e.layout=="string"){const i={single:{id:"single",slots:[{x:10,y:10,width:80,height:80}]},"two-vertical":{id:"two-vertical",slots:[{x:10,y:5,width:80,height:43},{x:10,y:52,width:80,height:43}]},"two-horizontal":{id:"two-horizontal",slots:[{x:5,y:15,width:43,height:70},{x:52,y:15,width:43,height:70}]},"three-left":{id:"three-left",slots:[{x:5,y:5,width:55,height:90},{x:63,y:5,width:32,height:43},{x:63,y:52,width:32,height:43}]},"three-right":{id:"three-right",slots:[{x:10,y:5,width:80,height:50},{x:10,y:58,width:38,height:37},{x:52,y:58,width:38,height:37}]},"four-grid":{id:"four-grid",slots:[{x:5,y:5,width:43,height:43},{x:52,y:5,width:43,height:43},{x:5,y:52,width:43,height:43},{x:52,y:52,width:43,height:43}]},"collage-5":{id:"collage-5",slots:[{x:5,y:5,width:43,height:43},{x:52,y:5,width:43,height:43},{x:5,y:52,width:43,height:43},{x:52,y:52,width:20,height:20},{x:75,y:52,width:20,height:20}]},"collage-6":{id:"collage-6",slots:[{x:5,y:5,width:30,height:40},{x:38,y:5,width:24,height:40},{x:65,y:5,width:30,height:40},{x:5,y:50,width:30,height:40},{x:38,y:50,width:24,height:40},{x:65,y:50,width:30,height:40}]}},a=i[e.layout];a?(console.log(`[RenderEngine] Resolved layout string "${e.layout}" → object with ${a.slots.length} slots`),e.layout={...a}):(console.warn(`[RenderEngine] Unknown layout string: "${e.layout}", falling back to single`),e.layout={...i.single})}if(e.layout&&!e.layout.slots&&(e.layout.slots=[]),e.layout&&e.layout.slots){const i=o.clientWidth||800,a=o.clientHeight||600;e.layout.slots.forEach(l=>{const c=document.createElement("div");c.className="page-slot photo-slot",c.style.position="absolute",c.style.left=`${parseFloat(l.x)}%`,c.style.top=`${parseFloat(l.y)}%`,c.style.width=`${parseFloat(l.width)}%`,c.style.height=`${parseFloat(l.height)}%`,l.rotation&&Math.abs(l.rotation)>.05&&(c.style.transform=`rotate(${l.rotation}deg)`,c.style.transformOrigin="center center",c.style.zIndex="3",c.style.filter="drop-shadow(0 5px 18px rgba(0,0,0,0.28))"),c.draggable=!0,e.spacing&&(c.style.boxSizing="border-box",c.style.padding=`${e.spacing}px`);const d=document.createElement("div");d.style.position="relative",d.style.width="100%",d.style.height="100%";const p=document.createElement("div");p.style.position="absolute",p.style.inset="0",p.style.width="100%",p.style.height="100%",p.style.overflow="hidden";const u=l.shape||e.imageShape||"rect";u==="circle"?p.style.clipPath="circle(50% at 50% 50%)":u==="oval"?p.style.clipPath="ellipse(50% 45% at 50% 50%)":u==="rounded"&&(p.style.borderRadius="16px"),d.appendChild(p),c.appendChild(d),c.addEventListener("dragstart",y=>{y.stopPropagation(),y.dataTransfer.setData("application/json",JSON.stringify({type:"slot-swap",photoId:l.photoId,pageId:e.id})),c.style.opacity="0.5"}),c.addEventListener("dragend",()=>{c.style.opacity="1"});const g=l.photoId||l.assetId||l.id||(l.photoIndex!==void 0?`index_${l.photoIndex}`:null);c.dataset.selectableId=g;const m=t.photos.find(y=>y.id==g||y.id===l.photoId);if(!m){console.warn(`[RenderEngine] Photo NOT FOUND for slot. ID: ${g}. Available: ${t.photos.length}`);const y=document.createElement("div");y.style.width="100%",y.style.height="100%",y.style.background="rgba(200, 200, 210, 0.15)",y.style.color="rgba(150, 150, 160, 0.6)",y.style.display="flex",y.style.alignItems="center",y.style.justifyContent="center",y.style.fontSize="28px",y.innerHTML="📷",p.appendChild(y)}if(m){const y=document.createElement("img");let w=m.thumbnailUrl||m.url||m.rawBaseUrl;w||(y.src="assets/placeholder-image.png",p.style.border="2px solid orange",console.warn("[RenderEngine] Photo has no URLs:",m)),y.style.width="100%",y.style.height="100%",y.style.background="#e2e8f0",y.style.minHeight="100px",y.style.objectFit="cover",y.style.width="100%",y.style.height="100%";const b=m._visionAnalysis||window.photoQualityService?.analysisCache?.get(m.id);if(l.manualObjectPosition)y.style.objectPosition=l.manualObjectPosition,y.onload=()=>{y.style.background="transparent"};else if(l.crop){const f=l.crop.width||100,x=l.crop.height||100,C=l.crop.x+f/2,I=l.crop.y+x/2;let E=m.width||1e3*(m.ratio||1.5),T=m.height||1e3;const k=C/E*100,L=I/T*100;y.style.objectPosition=`${k}% ${L}%`,y.onload=()=>{y.style.background="transparent"}}else if(m.visionFocalPoint||b){const f=b||{};let x=m.visionFocalPoint?.focalX??f.focalX??50,C=m.visionFocalPoint?.focalY??f.focalY??50;const I=f.faces||[];if(I.length>0){let E=100,T=0;I.forEach(L=>{const _=(L.width||20)/2;E=Math.min(E,(L.centerX||50)-_),T=Math.max(T,(L.centerX||50)+_)}),x=Math.max(10,Math.min(90,(E+T)/2));const k=f.headTop??Math.min(...I.map(L=>L.headTop??Math.max(0,(L.centerY||50)-(L.height||25)/2-(L.height||25)*.35)));C=Math.max(0,Math.min(60,k))}y.style.objectPosition=`${x}% ${C}%`,y.onload=()=>{if(y.style.background="transparent",I.length>0){const E=Ee(y,p,f);E!==null&&(y.style.objectPosition=`${x}% ${E}%`)}},m.visionFocalPoint||(m.visionFocalPoint={focalX:x,focalY:C})}else y.style.objectPosition="50% 35%",y.onload=()=>{y.style.background="transparent";try{const f=window.photoQualityService?.analysisCache?.get(m.id);if(f&&f.faces&&f.faces.length>0){let x=f.focalX??50;const C=Ee(y,p,f,x);C!==null&&(y.style.objectPosition=`${x}% ${C}%`),m.visionFocalPoint={focalX:x,focalY:C??35}}}catch{}};if(m.source==="google-photos"||w&&w.includes("googleusercontent.com")){let f=w||"";f&&!f.includes("=")?f+="=w800":f&&f.includes("=d")&&(f=f.replace("=d","=w800")),y.src=m.thumbnailUrl||f||"assets/placeholder-image.png",y.onerror=()=>{m.thumbnailUrl||(y.src="assets/placeholder-image.png")}}else w&&w.includes("unsplash.com")&&w.includes("&w=")&&!w.includes("&w=2048")&&(w=w.replace(/&w=\d+/,"&w=2048")),y.src=w,y.onerror=()=>{m.thumbnailUrl&&y.src!==m.thumbnailUrl?y.src=m.thumbnailUrl:y.src="assets/placeholder-image.png"};const v=l.computedFilter||l.filter;v&&v!=="none"&&(y.style.filter=v);const S=l.frameId||e.imageFrameId;if(S&&window.IMAGE_FRAMES){const f=window.IMAGE_FRAMES.find(x=>x.id===S||x.id==="img-"+S||x.id===S.replace("img-",""));if(f){const x=i*parseFloat(l.width)/100,C=a*parseFloat(l.height)/100,I=l.shape||e.imageShape||"rect",E=l.frameColor||e.imageFrameColor||f.color,T=f.svgGen(x,C,E,I),k=this.createSVG(T,x,C);k.style.position="absolute",k.style.inset="0",k.style.width="100%",k.style.height="100%",k.style.pointerEvents="none",k.style.zIndex="5",c.appendChild(k)}}p.appendChild(y),c.addEventListener("dblclick",f=>{if(window.store&&window.store.state&&!window.store.state.isPreview)if(f.stopPropagation(),f.preventDefault(),c.classList.contains("mc-crop-active")){c.classList.remove("mc-crop-active"),y.style.cursor="",c.style.outline="",c.style.boxShadow="",c.style.zIndex="",c.setAttribute("draggable","true");const C=c.querySelector(".mc-crop-hint");C&&C.remove(),l.manualObjectPosition=y.style.objectPosition,window.store&&(window.store.pushState("Repositioned Photo"),window.store.notify("pages",window.store.state.pages))}else{c.classList.add("mc-crop-active"),y.style.cursor="grab",c.style.outline="4px solid #007bff",c.style.boxShadow="0 0 15px rgba(0, 123, 255, 0.5)",c.style.zIndex="100",c.setAttribute("draggable","false");const C=document.createElement("div");C.className="mc-crop-hint",C.innerHTML='<span style="background:rgba(0,0,0,0.8); color:#fff; padding:6px 12px; border-radius:6px; font-size:13px; pointer-events:none; font-weight:bold; letter-spacing:0.5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><i class="fa-solid fa-arrows-up-down-left-right"></i> Drag to reposition. Double-click to set.</span>',C.style.position="absolute",C.style.bottom="15px",C.style.left="50%",C.style.transform="translateX(-50%)",C.style.zIndex="101",c.appendChild(C)}}),y.addEventListener("mousedown",f=>{if(c.classList.contains("mc-crop-active")){f.preventDefault(),y.style.cursor="grabbing";const x=f.clientX,C=f.clientY,E=(y.style.objectPosition||"50% 50%").split(" "),T=parseFloat(E[0])||50,k=parseFloat(E[1])||50,L=y.getBoundingClientRect(),_=100/(L.width||200),R=100/(L.height||200),$=Y=>{const ae=Y.clientX-x,F=Y.clientY-C;let M=T-ae*_,z=k-F*R;M=Math.max(0,Math.min(100,M)),z=Math.max(0,Math.min(100,z)),y.style.objectPosition=`${M}% ${z}%`},B=()=>{y.style.cursor="grab",document.removeEventListener("mousemove",$),document.removeEventListener("mouseup",B)};document.addEventListener("mousemove",$),document.addEventListener("mouseup",B)}})}if(l.photoId===s){c.classList.add("selected");const y=document.createElement("div");y.className="selection-overlay",c.appendChild(y)}c.addEventListener("click",y=>{y.stopPropagation(),c.dataset.selectableType="photo",c.dataset.selectableId=l.photoId}),n.appendChild(c)})}if(e.pageFrameId&&window.PAGE_FRAMES){const i=window.PAGE_FRAMES.find(a=>a.id===e.pageFrameId);if(i){const a=o.clientWidth||800,l=o.clientHeight||600,c=i.svgGen(a,l,i.color),d=this.createSVG(c,a,l);d.setAttribute("class","page-frame"),d.style.position="absolute",d.style.inset="0",d.style.pointerEvents="none",d.style.zIndex=5,n.appendChild(d)}}e.elements&&Array.isArray(e.elements)&&(console.log(`[RenderEngine] Rendering ${e.elements.length} elements for page ${e.id}`),e.elements.forEach(i=>{const a=document.createElement("div");if(a.className=`page-element element-${i.type}`,a.style.position="absolute",a.style.left=`${i.x}%`,a.style.top=`${i.y}%`,i.zIndex!==void 0&&(a.style.zIndex=i.zIndex),i.transform&&(a.style.transform=i.transform),a.dataset.selectableType=i.type,a.dataset.selectableId=i.id,i.type==="text"){a.classList.add("text-element"),a.style.minWidth="200px",i.pixelWidth&&(a.style.width=i.pixelWidth),i.pixelHeight&&(a.style.height=i.pixelHeight),a.style.maxWidth=`${i.width||50}%`,i.zIndex||(a.style.zIndex=10);const l=window.TEXT_STYLES?.find(p=>p.id===i.styleId),c=l?l.style:{};if(Object.assign(a.style,c),i.fontSize&&(a.style.fontSize=`${i.fontSize}px`),i.color&&(a.style.color=i.color),i.fontFamily&&(a.style.fontFamily=i.fontFamily),i.textAlign&&(a.style.textAlign=i.textAlign),i.fontWeight&&(a.style.fontWeight=i.fontWeight),i.letterSpacing&&(a.style.letterSpacing=i.letterSpacing),i.lineHeight&&(a.style.lineHeight=i.lineHeight),i.centered){const p=i.transform||"";a.style.transform=p?`${p} translateX(-50%)`:"translateX(-50%)",a.style.textAlign="center"}if(i.direction==="rtl"&&(a.style.direction="rtl",a.style.unicodeBidi="plaintext"),a.textContent=i.content,/[\u0590-\u05FF]/.test(i.content)){if(a.style.direction="rtl",a.style.textAlign=i.textAlign||"right",a.style.unicodeBidi="plaintext",!i.fontFamily){const p={fredoka:"'Fredoka', sans-serif",heebo:"'Heebo', sans-serif","amatic-sc":"'Amatic SC', cursive","frank-ruhl-libre":"'Frank Ruhl Libre', serif","varela-round":"'Varela Round', sans-serif",rubik:"'Rubik', sans-serif","playpen-sans-hebrew":"'Playpen Sans Hebrew', cursive"},u=e.fontId,g=u&&p[u]?p[u]:"'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Amatic SC', 'Heebo', sans-serif";a.style.fontFamily=g}i.centered&&(a.style.textAlign="center")}}else if(i.type==="gradient-overlay")a.classList.add("gradient-overlay-element"),a.style.left="0",a.style.top="0",a.style.width="100%",a.style.height="100%",a.style.background=i.gradient||"linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)",a.style.pointerEvents="none",i.zIndex||(a.style.zIndex="3");else if(i.type==="shape")a.classList.add("shape-element"),i.subtype&&a.classList.add(i.subtype),a.style.width=`${i.width}%`,a.style.height=`${i.height}%`,i.fill&&(a.style.backgroundColor=i.fill),i.color&&(a.style.backgroundColor=i.color),i.borderRadius&&(a.style.borderRadius=`${i.borderRadius}px`);else if(i.type==="element"){a.classList.add("visual-element"),i.pixelWidth?a.style.width=i.pixelWidth:a.style.width="100px",i.pixelHeight?a.style.height=i.pixelHeight:a.style.height="100px";const l=document.createElement("img");l.src=i.url,l.style.width="100%",l.style.height="100%",l.style.objectFit="contain",l.draggable=!1;let c="";i.filterHue&&(c+=`hue-rotate(${i.filterHue}deg) `),i.filterBrightness&&i.filterBrightness!==100&&(c+=`brightness(${i.filterBrightness}%) `),i.filterShadow&&(c+=`drop-shadow(2px 4px 6px ${i.filterShadowColor||"rgba(0,0,0,0.5)"}) `),c&&(l.style.filter=c.trim()),a.appendChild(l)}else if(i.type==="qr"){if(a.classList.add("qr-element"),a.style.width=i.pixelWidth||"80px",a.style.height=i.pixelHeight||"80px",i.zIndex||(a.style.zIndex=15),i.url){const l=document.createElement("img");l.src=i.url,l.style.width="100%",l.style.height="100%",l.style.objectFit="contain",l.style.borderRadius="6px",l.draggable=!1,a.appendChild(l)}if(i.isVideo){const l=document.createElement("div");l.textContent="▶ Video",l.style.position="absolute",l.style.bottom="-8px",l.style.left="50%",l.style.transform="translateX(-50%)",l.style.background="linear-gradient(135deg, #e74c3c, #c0392b)",l.style.color="#fff",l.style.fontSize="8px",l.style.fontWeight="700",l.style.padding="2px 8px",l.style.borderRadius="8px",l.style.whiteSpace="nowrap",l.style.letterSpacing="0.5px",l.style.boxShadow="0 1px 3px rgba(0,0,0,0.3)",a.appendChild(l)}}i.id===s&&(a.classList.add("selected"),a.style.border="2px solid var(--color-primary, #6366f1)"),n.appendChild(a)})),e.decorations&&Array.isArray(e.decorations)&&e.decorations.forEach((i,a)=>{const l=document.createElement("div");if(l.className=`page-decoration deco-${i.type}`,l.style.position="absolute",i.position&&(l.style.left=`${i.position.x}%`,l.style.top=`${i.position.y}%`,l.style.width=`${i.position.width}%`,l.style.height=`${i.position.height}%`,i.position.rotation&&(l.style.transform=`rotate(${i.position.rotation}deg)`),l.style.zIndex=i.position.z_index||4),i.opacity&&(l.style.opacity=i.opacity),i.asset_url){const c=document.createElement("img");c.src=i.asset_url,c.style.width="100%",c.style.height="100%",c.style.objectFit="contain",i.color,l.appendChild(c)}else i.type==="flourish"&&(l.innerHTML=`<svg viewBox="0 0 100 100" style="width:100%;height:100%;fill:${i.color||"#000"}"><path d="M10,50 Q25,25 50,50 T90,50" stroke="currentColor" fill="none" class="mock-flourish"/></svg>`);n.appendChild(l)}),o.appendChild(n),console.log(`[RenderEngine] Finished rendering page ${e.id}. Child nodes: ${n.childNodes.length}`)}renderPage(e,t,o=null){this.renderPageToContainer(e,t,this.container,o)}createSVG(e,t,o){const s=new DOMParser,n=`<svg width="${t}" height="${o}" viewBox="0 0 ${t} ${o}" xmlns="http://www.w3.org/2000/svg" style="display:block; width:100%; height:100%">${e}</svg>`;return s.parseFromString(n,"image/svg+xml").documentElement}renderCover(e,t,o=null){this.container.innerHTML="";const s=o?.designSystem||{},n=s.colors||{},r=s.typography||{},i=n.decorative||{},a=e.color||n.background||e.theme||"#fff",l=e.textColor||n.text?.primary||"#000";i.gold||n.accent;const c=r.title?.family||r.heading?.family||"Playfair Display, serif",d=r.body?.family||"Montserrat, sans-serif",p=document.createElement("div");p.className="cover-wrapper",p.style.display="flex",p.style.width="100%",p.style.height="100%",p.style.padding="40px",p.style.gap="20px",p.style.justifyContent="center",p.style.alignItems="center",p.style.backgroundColor="#222";const u=document.createElement("div");u.className="cover-page back-cover",u.style.width="45%",u.style.height="100%",u.style.position="relative",u.style.boxShadow="5px 5px 15px rgba(0,0,0,0.5)";const g=L=>{if(e.theme&&typeof e.theme=="string"){if(e.theme.startsWith("#")||e.theme.startsWith("rgb")){L.style.backgroundColor=e.theme;return}if(e.theme.startsWith("data:")){L.style.backgroundImage=`url("${e.theme}")`,L.style.backgroundSize="cover",L.style.backgroundPosition="center";return}const _=window.BACKGROUND_TEXTURES?.find(R=>R.id===e.theme);if(_){_.url.startsWith("http")||_.url.startsWith("assets")||_.url.startsWith("data:")?(L.style.backgroundImage=`url('${_.url}')`,L.style.backgroundSize="cover"):L.style.backgroundColor=_.url;return}}if(n.background){L.style.backgroundColor=n.background;return}L.style.backgroundColor=e.color||e.theme||"#fff"};if(g(u),e.backPhotoId){const L=t.photos.find(_=>_.id===e.backPhotoId);if(L){const _=document.createElement("img");if(_.style.width="100%",_.style.height="100%",_.style.objectFit="cover",L.source==="google-photos"||L.url&&L.url.includes("googleusercontent.com")){let R=L.rawBaseUrl||L.url;R.includes("=")?R.includes("=d")&&(R=R.replace("=d","=w1200")):R+="=w1200",_.src=L.thumbnailUrl||R}else _.src=L.url;u.appendChild(_)}}u.dataset.selectableId="cover-back-photo",u.dataset.selectableType="cover-back-photo",u.addEventListener("click",L=>{}),p.appendChild(u);const m=document.createElement("div");m.className="cover-spine",m.style.width="40px",m.style.height="100%",m.style.backgroundColor=a,m.style.display="flex",m.style.alignItems="center",m.style.justifyContent="center",m.style.boxShadow="inset 2px 0 5px rgba(0,0,0,0.2)";const y=document.createElement("div"),w=e.spineText||e.title;y.textContent=w,y.style.writingMode="vertical-rl",y.style.transform="rotate(180deg)",y.style.fontFamily=c,y.style.fontSize="14px",y.style.color=l,/[\u0590-\u05FF]/.test(w)&&(y.style.fontFamily="'Fredoka', 'Heebo', sans-serif"),m.appendChild(y),p.appendChild(m);const v=document.createElement("div");v.className="cover-page front-cover",v.style.width="45%",v.style.height="100%",g(v),v.style.position="relative",v.style.boxShadow="-5px 5px 15px rgba(0,0,0,0.5)",v.style.overflow="hidden",v.addEventListener("click",L=>{L.stopPropagation()});const S=e.layout||"standard",f=document.createElement("div");f.style.position="absolute",f.style.zIndex=10,f.style.textAlign="center",f.style.width="100%";const x=document.createElement("h1");x.textContent=e.title,x.style.margin="0",x.style.fontFamily=c,x.style.color=l,x.style.fontSize="2.5rem",x.dataset.selectableId="cover-title",x.dataset.selectableType="cover-text";const C=document.createElement("h3");C.textContent=e.subtitle,C.style.margin="10px 0 0 0",C.style.fontFamily=d,C.style.color=l,C.style.opacity="0.85",C.dataset.selectableId="cover-subtitle",C.dataset.selectableType="cover-text";const I=/[\u0590-\u05FF]/,E=I.test(e.title||""),T=I.test(e.subtitle||"");(E||T)&&(f.style.direction="rtl",E&&(x.style.fontFamily="'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Heebo', sans-serif",x.style.direction="rtl"),T&&(C.style.fontFamily="'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Heebo', sans-serif",C.style.direction="rtl")),f.appendChild(x),f.appendChild(C);let k=null;if(e.frontPhotoId){const L=t.photos.find(_=>_.id===e.frontPhotoId);if(L)if(k=document.createElement("div"),k.style.position="absolute",k.style.backgroundSize="cover",k.style.backgroundPosition="center",k.dataset.selectableId="cover-photo",k.dataset.selectableType="cover-photo",L.source==="google-photos"||L.url&&L.url.includes("googleusercontent.com")){let _=L.rawBaseUrl||L.url;_.includes("=")?_.includes("=d")&&(_=_.replace("=d","=w1200")):_+="=w1200",k.style.backgroundImage=`url(${L.thumbnailUrl||_})`}else k.style.backgroundImage=`url(${L.url})`}k||(k=document.createElement("div"),k.className="empty-slot",k.textContent="Drop Cover Photo Here",k.style.display="flex",k.style.alignItems="center",k.style.justifyContent="center",k.style.border="2px dashed #999",k.style.color="#666",k.style.position="absolute",k.dataset.selectableId="cover-photo",k.dataset.selectableType="cover-photo"),S==="full-bleed"?(k.style.inset="0",f.style.bottom="10%",x.style.color="#fff",C.style.color="#fff",x.style.textShadow="0 2px 4px rgba(0,0,0,0.5)",v.appendChild(k),v.appendChild(f)):S==="photo-bottom"?(f.style.top="10%",k.style.bottom="10%",k.style.left="10%",k.style.width="80%",k.style.height="60%",v.appendChild(f),v.appendChild(k)):(f.style.bottom="10%",k.style.top="10%",k.style.left="10%",k.style.width="80%",k.style.height="60%",v.appendChild(k),v.appendChild(f)),p.appendChild(v),this.container.appendChild(p)}}const ye="'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Amatic SC', 'Heebo', sans-serif",dt=/[\u0590-\u05FF]/;class he{constructor(e){this.config=e||{},this.ds=this.config.designSystem||{},this.ds.colors=this.ds.colors||{background:"#FFFFFF",text:{primary:"#333333"}},this.ds.colors.text=this.ds.colors.text||{primary:"#333333"},this.ds.typography=this.ds.typography||{},this.ds.photoStyles=this.ds.photoStyles||{},this.ds.canvas=this.ds.canvas||{width:800,height:600},this.ds.decorativeElements=this.ds.decorativeElements||this.config.decorativeElements||{},this.direction=this.config.direction||this.ds.direction||"rtl"}renderPage(e,t=[],o={},s={},n={}){const r=document.createElement("div"),i=this.config.templateId||"",a=e.layoutId||"";return r.className=`album-page ${this._templateClass(i)} ${a}`,e.backgroundType&&r.classList.add(e.backgroundType),e.pageType&&r.classList.add(e.pageType),a&&a.split("-").forEach(l=>{l&&r.classList.add(l)}),this._applyBackground(r,n),r.style.direction=this.direction,this._renderDecorations(r,e.decorations),e.photoSlots&&e.photoSlots.forEach((l,c)=>{this._renderPhotoSlot(r,l,t[c]||null,c,n)}),e.textElements&&e.textElements.forEach(l=>{const c=o[l.elementId]||l.placeholder||l.content||"",d=s[l.elementId]||null;this._renderTextElement(r,l,c,d)}),r}renderCover(e,t){const o=this.config.pageLayouts?.find(s=>s.pageType==="cover"||s.layoutId?.includes("cover"));if(o){const s=[];if(e.frontPhotoId&&t?.photos){const r=t.photos.find(i=>i.id===e.frontPhotoId);r&&s.push(r)}const n={childName:e.title||"",title:e.title||"",hebrewDate:e.subtitle||"",gregorianDate:"",barMitzvahLabel:e.label||"",subtitle:e.subtitle||""};return this.renderPage(o,s,n,{},{})}return this._createFallbackCover(e,t)}_renderPhotoSlot(e,t,o,s,n={}){const r=document.createElement("div"),i=["photo-slot"];t.photoStyle&&i.push(`photo-${t.photoStyle}`),t.slotId&&i.push(t.slotId),r.className=i.join(" "),r.draggable=!0,r.dataset.selectableType=o?"photo":"empty-slot",r.dataset.slotId=t.slotId||`slot-${s}`,o&&(r.dataset.selectableId=o.id||`photo-${s}`);const a=t.photoStyle||"default",l=this.ds.photoStyles[a]||{},c=l.borderRadius||"0px",d=l.shadow||"none",p=l.border||"none",u=l.clipPath||"";let g=`
            position: absolute;
            left: ${t.position.x};
            top: ${t.position.y};
            width: ${t.size.width};
            height: ${t.size.height};
            overflow: hidden;
            border-radius: ${c};
            box-shadow: ${d};
            border: ${p};
            z-index: ${t.zIndex||1};
            background-color: rgba(0,0,0,0.03);
            direction: ltr;
            cursor: pointer;
        `;u&&(g+=`clip-path: ${u};`);let m=null;if(n.layout?.slots){const y=n.layout.slots.find(w=>w.slotId===t.slotId||o&&w.photoId===o.id);y?.frameId&&(m=y.frameId)}if(!m&&n.imageFrameId&&(m=n.imageFrameId),m&&window.IMAGE_FRAMES){const y=window.IMAGE_FRAMES.find(w=>w.id===m);if(y&&typeof y.svgGen=="function"){const w=this.ds.canvas.width||800,b=this.ds.canvas.height||600,v=w*parseFloat(t.size.width)/100,S=b*parseFloat(t.size.height)/100,f=t.frameColor||y.color,x=t.shape||"rect",C=y.svgGen(v,S,f,x),I=this._createSVG(C,v,S);I.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:10;",r.appendChild(I),g=g.replace(/box-shadow:[^;]+;/,"box-shadow: none;").replace(/border:[^;]+;/,"border: none;").replace(/border-radius:[^;]+;/,"border-radius: 0;")}}if(r.style.cssText=g,o){const y=document.createElement("img"),w=typeof o=="string";y.src=w?o:o.thumbnailUrl||o.baseUrl||o.url||o.src||"",y.style.cssText=`
                width: 100%;
                height: 100%;
                object-fit: ${t.photoFit||"cover"};
                display: block;
            `,y.onerror=()=>{!w&&o.url&&y.src!==o.url?y.src=o.url:y.src="assets/placeholder-image.png"},r.appendChild(y),r.addEventListener("dragstart",v=>{v.stopPropagation(),v.dataTransfer.setData("application/json",JSON.stringify({type:"slot-swap",photoId:o.id||`photo-${s}`,slotId:t.slotId})),r.style.opacity="0.5"}),r.addEventListener("dragend",()=>{r.style.opacity="1"});const b=document.createElement("button");b.className="btn-remove-slot-photo",b.innerHTML="×",b.dataset.slotIndex=s,b.style.cssText=`
                position: absolute;
                top: 6px;
                right: 6px;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.6);
                color: white;
                border: 1px solid rgba(255,255,255,0.4);
                cursor: pointer;
                z-index: 100;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                line-height: 1;
                opacity: 0;
                transition: opacity 0.2s;
                pointer-events: auto;
            `,r.addEventListener("mouseenter",()=>b.style.opacity="1"),r.addEventListener("mouseleave",()=>b.style.opacity="0"),r.appendChild(b)}else r.classList.add("empty-slot"),r.dataset.selectableType="empty-slot",r.dataset.slotIndex=s,r.style.display="flex",r.style.alignItems="center",r.style.justifyContent="center",r.innerHTML='<span style="color:#aaa; font-size: 24px; pointer-events: none;">+</span>';e.appendChild(r)}_renderTextElement(e,t,o,s=null){const n=document.createElement("div"),r=["text-element"];if(t.type&&r.push(`text-${t.type}`),t.style?.font&&r.push(`text-${t.style.font}`),t.elementId){const v=t.elementId.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g,"$1-$2").toLowerCase();r.push(v)}n.className=r.join(" "),n.dataset.selectableType="text",n.dataset.selectableId=t.elementId,t.editable!==!1&&(n.contentEditable="false",n.setAttribute("spellcheck","false"));const i=t.style?.font||"body",a=this.ds.typography[i]||this.ds.typography.body||{family:"Heebo",fallback:"sans-serif"},l=a?`'${a.family}', ${a.fallback}`:"sans-serif",c=t.style?.color||"primary",d=this._resolveColor(c),p=t.style?.size||"14px",u=t.style?.weight||400,g=t.style?.letterSpacing||"normal";let y=`
            position: absolute;
            top: ${s?.y||t.position.y};
            font-family: ${l};
            font-size: ${p};
            font-weight: ${u};
            color: ${d};
            letter-spacing: ${g};
            z-index: 20;
            cursor: grab;
            direction: ${this.direction};
            overflow: hidden;
            word-break: break-word;
            overflow-wrap: break-word;
            max-width: 90%;
            box-sizing: border-box;
        `;const w=this._getAlignmentCSS(t);s?.x?(y+=`left: ${s.x};`,y+=`text-align: ${w.textAlign||"right"};`,w.width&&(y+=`width: ${w.width};`)):(w.left!==void 0&&w.left!=="auto"?y+=`left: ${w.left};`:w.left==="auto"&&(y+="left: auto;"),w.right!==void 0&&w.right!=="auto"?y+=`right: ${w.right};`:w.right==="auto"&&(y+="right: auto;"),w.transform&&(y+=`transform: ${w.transform};`),w.textAlign?y+=`text-align: ${w.textAlign};`:y+=`text-align: ${this.direction==="rtl"?"right":"left"};`,w.width&&(y+=`width: ${w.width};`)),t.style?.lineHeight&&(y+=`line-height: ${t.style.lineHeight};`),t.style?.textShadow&&(y+=`text-shadow: ${t.style.textShadow};`),t.style?.opacity&&(y+=`opacity: ${t.style.opacity};`);const b=t.style?.fontStyle||t.style?.style;b&&(b==="italic"||b==="normal")&&(y+=`font-style: ${b};`),n.style.cssText=y,dt.test(o)&&(n.style.direction="rtl",n.style.unicodeBidi="plaintext",!l.includes("Heebo")&&!l.includes("Rubik")&&!l.includes("Frank Ruhl")&&!l.includes("Fredoka")&&!l.includes("Playpen Sans")&&!l.includes("Varela")&&(n.style.fontFamily=ye)),n.innerHTML=o?o.replace(/\n/g,"<br>"):"",e.appendChild(n)}_getAlignmentCSS(e){const t={},o=e.alignment||{},s=o.method||"";if(s){const n=s.match(/left:\s*([^;]+)/),r=s.match(/right:\s*([^;]+)/),i=s.match(/transform:\s*([^;]+)/);if(i&&(i[1].includes("translateX(-50%)")||i[1].includes("translate(-50%")))t.left=n?n[1].trim():e.position.x||"50%",t.transform=i[1].trim(),t.textAlign=o.textAlign||"center";else if(r)t.right=r[1].trim(),t.left="auto",t.textAlign=o.textAlign||"right";else if(n)t.left=n[1].trim(),t.right="auto",t.textAlign=o.textAlign||"left";else{const a=s.match(/text-align:\s*([^;]+)/);if(a){const l=a[1].trim();t.textAlign=l,l==="center"?(t.left=e.position.x||"50%",t.transform="translateX(-50%)"):l==="right"?t.left=e.position.x||"auto":t.left=e.position.x||"0"}}}else o.horizontal==="center"||e.style?.align==="center"?(t.left=e.position.x||"50%",t.transform="translateX(-50%)",t.textAlign="center"):o.horizontal==="right"||e.style?.align==="right"?(t.right=e.position.x||"6%",t.left="auto",t.textAlign="right"):o.horizontal==="left"||e.style?.align==="left"?(t.left=e.position.x||"6%",t.right="auto",t.textAlign="left"):this.direction==="rtl"?(t.right=e.position.x||"6%",t.left="auto",t.textAlign="right"):(t.left=e.position.x||"6%",t.right="auto",t.textAlign="left");return e.size?.width&&(t.width=e.size.width),t}_renderDecorations(e,t){!t||!Array.isArray(t)||t.forEach(o=>{switch(o.type){case"goldLine":this._renderGoldLine(e,o);break;case"verticalLine":this._renderGoldLine(e,o);break;case"starOfDavid":this._renderStarOfDavid(e,o);break;case"ornament":this._renderOrnament(e,o);break;case"overlay":this._renderOverlay(e,o);break;case"filmStrip":this._renderFilmStrip(e,o);break;default:this._renderGenericDecoration(e,o);break}})}_renderGoldLine(e,t){const o=this._resolveDecorativeColor(t.color),s=document.createElement("div");s.className=`decoration deco-${t.type}`,s.style.cssText=`
            position: absolute;
            left: ${t.position.x};
            top: ${t.position.y};
            width: ${t.size.width};
            height: ${t.size.height};
            background-color: ${o};
            z-index: 0;
            pointer-events: none;
        `,e.appendChild(s)}_renderStarOfDavid(e,t){const o=this._resolveDecorativeColor(t.color),s=document.createElement("div");s.className="decoration deco-star-of-david",s.innerHTML=`
            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="50,10 85,75 15,75" stroke="${o}" fill="none" />
                <polygon points="50,90 85,25 15,25" stroke="${o}" fill="none" />
            </svg>
        `,s.style.cssText=`
            position: absolute;
            left: ${t.position.x};
            top: ${t.position.y};
            width: ${t.size.width};
            height: ${t.size.height};
            opacity: ${t.opacity||.15};
            color: ${o};
            transform: translate(-50%, -50%);
            z-index: 0;
            pointer-events: none;
        `,e.appendChild(s)}_renderOrnament(e,t){const o=this._resolveDecorativeColor(t.color),s=document.createElement("div");s.className="decoration deco-ornament",s.innerHTML="❖",s.style.cssText=`
            position: absolute;
            left: ${t.position.x};
            top: ${t.position.y};
            font-size: 24px;
            color: ${o};
            transform: translate(-50%, -50%);
            opacity: 0.6;
            z-index: 0;
            pointer-events: none;
        `,e.appendChild(s)}_renderOverlay(e,t){const o=document.createElement("div");o.className="decoration deco-overlay";const s=t.style?.background||t.style?.backgroundColor||"rgba(0,0,0,0.05)";o.style.cssText=`
            position: absolute;
            left: ${t.position.x};
            top: ${t.position.y};
            width: ${t.size.width};
            height: ${t.size.height};
            background: ${s};
            border-radius: ${t.style?.borderRadius||"0"};
            z-index: 5;
            pointer-events: none;
        `,e.appendChild(o)}_renderFilmStrip(e,t){const o=document.createElement("div");o.className="decoration deco-film-strip film-strip",o.style.cssText=`
            position: absolute;
            left: ${t.position.x};
            top: ${t.position.y};
            width: ${t.size.width};
            height: ${t.size.height};
            z-index: 0;
            pointer-events: none;
        `,e.appendChild(o)}_renderGenericDecoration(e,t){if(!t.position||!t.size)return;const o=this._resolveDecorativeColor(t.color)||"rgba(0,0,0,0.1)",s=document.createElement("div");s.className=`decoration deco-${t.type||"generic"}`,s.style.cssText=`
            position: absolute;
            left: ${t.position.x};
            top: ${t.position.y};
            width: ${t.size.width};
            height: ${t.size.height};
            background-color: ${t.style?.backgroundColor||o};
            opacity: ${t.opacity||1};
            z-index: 0;
            pointer-events: none;
        `,e.appendChild(s)}_applyBackground(e,t={}){if(t.background){if(typeof t.background=="string"){if(t.background.startsWith("#")||t.background.startsWith("rgb")){e.style.backgroundColor=t.background;return}if(t.background.startsWith("http")||t.background.startsWith("data:")||t.background.startsWith("url")){const s=t.background.startsWith("url")?t.background:`url('${t.background}')`;e.style.backgroundImage=s,e.style.backgroundSize="cover",e.style.backgroundPosition="center";return}const o=window.BACKGROUND_TEXTURES?.find(s=>s.id===t.background);if(o){o.url.startsWith("http")||o.url.startsWith("assets")||o.url.startsWith("data:")?(e.style.backgroundImage=`url('${o.url}')`,e.style.backgroundSize="cover"):e.style.backgroundColor=o.url;return}}else if(typeof t.background=="object"&&t.background.color){e.style.backgroundColor=t.background.color;return}}e.style.backgroundColor=this.ds.colors.background||"#FFFFFF"}_resolveColor(e){if(!e)return this.ds.colors.text?.primary||"#333333";if(e.startsWith("#")||e.startsWith("rgb"))return e;const t=this.ds.colors;if(t.text){if(e==="primary")return t.text.primary;if(e==="secondary")return t.text.secondary;if(e==="gold")return t.text.gold||"#C9A227";if(e==="dark")return t.text.dark||t.text.primary||"#333";if(e==="darkSecondary")return t.text.darkSecondary||t.text.secondary;if(e==="light")return t.text.light||"#718096";if(e==="inverse")return t.text.inverse||"#FFFFFF";if(e==="title")return t.text.title||t.text.primary}return e==="accent"?t.accent?.primary||t.accent||"#6366f1":t.decorative&&t.decorative[e]?t.decorative[e]:e}_resolveDecorativeColor(e){return e?this._resolveColor(e):this.ds.colors.decorative?.gold||this.ds.colors.text?.gold||"#C9A227"}_createSVG(e,t,o){const s=document.createElement("div");return s.innerHTML=`<svg width="${t}" height="${o}" viewBox="0 0 ${t} ${o}" xmlns="http://www.w3.org/2000/svg" style="display:block; width:100%; height:100%">${e}</svg>`,s.firstElementChild}_templateClass(e){return e?e.replace(/-v\d+$/,"").replace(/-hebrew$/,"").replace(/-preview$/,""):""}_createFallbackCover(e,t){const o=document.createElement("div");o.className=`album-page album-cover ${this._templateClass(this.config.templateId)}`;const s=this.ds.colors.background||"#FFFFFF",n=this.ds.colors.text?.primary||"#333333",r=this.ds.colors.decorative?.gold||this.ds.colors.accent?.secondary||"#C9A227";o.style.cssText=`
            background-color: ${s};
            position: relative;
            overflow: hidden;
            direction: ${this.direction};
        `;const i=document.createElement("div");if(i.style.cssText=`
            position: absolute;
            inset: 20px;
            border: 2px solid ${r};
            pointer-events: none;
            z-index: 5;
        `,o.appendChild(i),e.frontPhotoId&&t?.photos){const l=t.photos.find(c=>c.id===e.frontPhotoId);if(l){const c=document.createElement("div");c.style.cssText=`
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -60%);
                    width: 50%;
                    height: 50%;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                `;const d=document.createElement("img");d.src=l.thumbnailUrl||l.url,d.style.cssText="width:100%;height:100%;object-fit:cover;",c.appendChild(d),o.appendChild(c)}}const a=document.createElement("div");return a.style.cssText=`
            position: absolute;
            bottom: 20%;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
            color: ${n};
            z-index: 10;
        `,a.innerHTML=`
            <div style="font-size: 14px; color: ${r}; margin-bottom: 8px;"></div>
            <div style="font-size: 36px; font-weight: 600; margin-bottom: 8px; font-family: ${ye};">${e.title||""}</div>
            <div style="font-size: 16px; opacity: 0.7; font-family: ${ye};">${e.subtitle||""}</div>
        `,o.appendChild(a),o}}typeof window<"u"&&(window.UnifiedTemplateRenderer=he);let pt=class{static LAYOUTS=[{id:"standard",label:"רגיל",description:"תמונה למעלה, טקסט למטה"},{id:"full-bleed",label:"תמונה מלאה",description:"התמונה ממלאת את כל הכריכה"},{id:"photo-bottom",label:"תמונה למטה",description:"טקסט למעלה, תמונה למטה"},{id:"centered",label:"ממורכז",description:"תמונה ממורכזת עם שכבת טקסט מעל"},{id:"minimal",label:"מינימליסטי",description:"טקסט בלבד, ללא תמונה"},{id:"split",label:"מפוצל",description:"תמונה משמאל, טקסט מימין"},{id:"elegant",label:"אלגנטי",description:"עיטורי גבול על תוכן ממורכז"}];static FONTS=[{id:"playfair",family:"'Playfair Display', serif",label:"Playfair Display"},{id:"montserrat",family:"'Montserrat', sans-serif",label:"Montserrat"},{id:"roboto",family:"'Roboto', sans-serif",label:"Roboto"},{id:"lato",family:"'Lato', sans-serif",label:"Lato"},{id:"opensans",family:"'Open Sans', sans-serif",label:"Open Sans"},{id:"cormorant",family:"'Cormorant Garamond', serif",label:"Cormorant Garamond"},{id:"dancing",family:"'Dancing Script', cursive",label:"Dancing Script"},{id:"great-vibes",family:"'Great Vibes', cursive",label:"Great Vibes"},{id:"cinzel",family:"'Cinzel', serif",label:"Cinzel"},{id:"raleway",family:"'Raleway', sans-serif",label:"Raleway"},{id:"heebo",family:"'Heebo', sans-serif",label:"Heebo (היבו)"},{id:"frankruhl",family:"'Frank Ruhl Libre', serif",label:"Frank Ruhl Libre (פרנק ריהל)"},{id:"rubik",family:"'Rubik', sans-serif",label:"Rubik (רוביק)"},{id:"varela",family:"'Varela Round', sans-serif",label:"Varela Round (ורלה)"},{id:"aleo",family:"'Aleo', serif",label:"Aleo (אלאו)"},{id:"caveat",family:"'Caveat', cursive",label:"Caveat (כתב יד)"},{id:"gveret-levin",family:"'Gveret Levin', cursive",label:"Gveret Levin (גברת לוין)"},{id:"playpen-hebrew",family:"'Playpen Sans Hebrew', cursive",label:"Playpen Sans Hebrew (פלייפן)"},{id:"amatic-sc",family:"'Amatic SC', cursive",label:"Amatic SC (אמטיק)"},{id:"fredoka",family:"'Fredoka', sans-serif",label:"Fredoka (פרדוקה)"}];static TEMPLATE_DEFAULTS={"romantic-journey-v1":{title:"Our Love Story",subtitle:"2024",spineText:"Our Love Story",layout:"elegant",titleFont:"'Playfair Display', serif",bodyFont:"'Montserrat', sans-serif",bgColor:"#1a1a2e",textColor:"#C9A227"},"travel-journey-v1":{title:"Travel Adventures",subtitle:"Memories & Journeys",spineText:"Travel Memories",layout:"full-bleed",titleFont:"'Montserrat', sans-serif",bodyFont:"'Open Sans', sans-serif",bgColor:"#2d3436",textColor:"#ffffff"},"bar-mitzvah-v1":{title:"בר מצווה",subtitle:"מזל טוב",spineText:"Bar Mitzvah",layout:"elegant",titleFont:"'Cinzel', serif",bodyFont:"'Montserrat', sans-serif",bgColor:"#1a1a2e",textColor:"#C9A227"},"wedding-prestige-hebrew-v1":{title:"החתונה שלנו",subtitle:"נצח",spineText:"חתונה",layout:"custom",titleFont:"'Frank Ruhl Libre', serif",bodyFont:"'Heebo', sans-serif",bgColor:"#0D0D0D",textColor:"#C9A962"},"family-roots-v1":{title:"Our Family",subtitle:"Generations of Love",spineText:"Family Album",layout:"standard",titleFont:"'Cormorant Garamond', serif",bodyFont:"'Lato', sans-serif",bgColor:"#f5f0eb",textColor:"#4a3728"},"photography-portfolio-v1":{title:"Portfolio",subtitle:"Selected Works",spineText:"Portfolio",layout:"minimal",titleFont:"'Raleway', sans-serif",bodyFont:"'Open Sans', sans-serif",bgColor:"#ffffff",textColor:"#1a1a1a"},default:{title:"My Photo Book",subtitle:new Date().getFullYear().toString(),spineText:"Photo Book",layout:"standard",titleFont:"'Playfair Display', serif",bodyFont:"'Montserrat', sans-serif",bgColor:"#ffffff",textColor:"#000000"},cover:{title:"My Photo Book",subtitle:new Date().getFullYear().toString(),spineText:"My Photo Book",layout:"standard",titleFont:"'Playfair Display', serif",bodyFont:"'Montserrat', sans-serif",bgColor:"#f5f0eb",textColor:"#333333"},"magic-page-v4":{title:"My Photo Book",subtitle:new Date().getFullYear().toString(),spineText:"My Photo Book",layout:"standard",titleFont:"'Playfair Display', serif",bodyFont:"'Montserrat', sans-serif",bgColor:"#f5f0eb",textColor:"#333333"}};static getTemplateDefaults(e){return this.TEMPLATE_DEFAULTS[e]||this.TEMPLATE_DEFAULTS.default}static render(e){const{cover:t,assets:o,templateConfig:s,container:n,interactive:r=!1,thumbnail:i=!1}=e;if(console.log("[UnifiedCoverRenderer] render() ENTRY - cover received:",JSON.stringify({background:t?.background,theme:t?.theme,title:t?.title,templateId:t?.templateId,id:t?.id,keys:t?Object.keys(t):"null"})),!t){const $=document.createElement("div");return $.style.cssText="display:flex;align-items:center;justify-content:center;height:100%;color:#666;",$.textContent="No Cover",n&&(n.innerHTML="",n.appendChild($)),$}const a=t.templateId||s?.templateId,l=this.getTemplateDefaults(a),c=s?.designSystem||{},d=c.colors||{},p=c.typography||{},u=t._userCustomColor?t.color:d.background||t.color||l.bgColor,g=t._userCustomTextColor?t.textColor:d.text?.primary||t.textColor||l.textColor,m=d.decorative?.gold||d.accent||"#C9A227",y=t._userCustomTitleFont?t.titleFont:p.title?.family||p.heading?.family||l.titleFont,w=t._userCustomBodyFont?t.bodyFont:p.body?.family||l.bodyFont;if(t.backgroundElementId&&window.COVER_ELEMENT_LIBRARY){const $=(window.COVER_ELEMENT_LIBRARY.backgrounds||[]).find(B=>B.id===t.backgroundElementId);$&&($.type==="city_skyline"&&$.backSvg&&!t._backSvgDataUri?t._resolvedBackSvg="data:image/svg+xml;charset=utf-8,"+encodeURIComponent($.backSvg):$.type==="gradient"?t._resolvedGradientCss=$.gradientCss:$.type==="solid_color"&&(t._resolvedSolidColor=$.solidColor))}let b=null;const v=window._magicCover||{},S=typeof t.background=="string"?t.background:t.background?.textureId||t.theme||v.background||v.theme||null;if(S){if(S.startsWith("data:")||S.startsWith("http")||S.startsWith("assets"))b=S,console.log("[UnifiedCoverRenderer] Direct URL background detected. Length:",S.length);else if(window.BACKGROUND_TEXTURES){const $=window.BACKGROUND_TEXTURES.find(B=>B.id===S);$&&$.url?(b=$.url,console.log("[UnifiedCoverRenderer] Resolved texture:",S,"→ URL length:",$.url.length)):console.warn("[UnifiedCoverRenderer] Texture NOT FOUND for ID:",S,"Available:",window.BACKGROUND_TEXTURES.length)}}else console.log("[UnifiedCoverRenderer] No background ID to resolve. cover.background:",t.background,"cover.theme:",t.theme,"magicFallback:",v.background);const f=t.title||l.title,x=t.subtitle||l.subtitle,C=t.spineText||t.title||l.spineText,I=t.layout||l.layout;if(i)return this.renderThumbnail({...t,title:f,subtitle:x,spineText:C},o,{bgColor:u,textColor:g,titleFont:y});const E=document.createElement("div");E.className="unified-cover-wrapper album-page";const T=s?.designSystem?.canvas?.width||800,k=s?.designSystem?.canvas?.height||600;E.style.cssText=`
            display: flex;
            width: ${T}px;
            height: ${k}px;
            padding: 0; /* Remove padding from wrapper, let internal sections handle it */
            gap: 0; /* Remove gap, spine handles spacing */
            justify-content: center;
            align-items: center;
            background-color: transparent; /* Background handled by sections */
            box-sizing: border-box;
            margin: auto; /* Center in container */
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); /* Match .album-page shadow */
        `;const L=this.createBackCover(t,o,{bgColor:u,textColor:g,interactive:r,bgTextureUrl:b});E.appendChild(L);const _=this.createSpine({...t,spineText:C},{bgColor:u,textColor:g,titleFont:y,bgTextureUrl:b});E.appendChild(_);const R=this.createFrontCover({...t,title:f,subtitle:x,layout:I},o,{bgColor:u,textColor:g,titleFont:y,bodyFont:w,accentColor:m,interactive:r,layout:I,bgTextureUrl:b});return E.appendChild(R),n&&(n.innerHTML="",n.appendChild(E)),E}static createBackCover(e,t,{bgColor:o,textColor:s,interactive:n,bgTextureUrl:r}){const i=document.createElement("div");i.className="cover-section back-cover",i.style.cssText=`
            flex: 1;
            height: 100%;
            position: relative;
            background-color: ${o};
            box-shadow: 3px 3px 10px rgba(0,0,0,0.4);
            border-radius: 2px 0 0 2px;
            overflow: hidden;
        `;const a=e._backSvgDataUri||r;if(a&&(i.style.backgroundImage=`url("${a}")`,i.style.backgroundSize="cover",i.style.backgroundPosition="center"),e.backPhotoId&&t?.photos){const l=t.photos.find(c=>c.id===e.backPhotoId);if(l){const c=document.createElement("img");c.src=l.thumbnailUrl||l.url;const d=e.backCrop||{},p=d.panX!==void 0?d.panX:50,u=d.panY!==void 0?d.panY:50;c.style.cssText=`width:100%;height:100%;object-fit:cover;object-position:${p}% ${u}%;`,c.onerror=()=>{c.src="assets/placeholder-image.png"},i.appendChild(c)}}else if(n){const l=document.createElement("div");l.style.cssText=`
                width: 100%; height: 100%;
                display: flex; align-items: center; justify-content: center;
                border: 2px dashed rgba(128,128,128,0.3);
                color: rgba(128,128,128,0.5);
                font-size: 13px;
                direction: rtl;
            `,l.textContent="גרור תמונה לכריכה האחורית",i.appendChild(l)}return n&&(i.dataset.selectableId="cover-back-photo",i.dataset.selectableType="cover-photo"),i}static createSpine(e,{bgColor:t,textColor:o,titleFont:s,bgTextureUrl:n}){const r=document.createElement("div");r.className="cover-section spine",r.style.cssText=`
            width: 30px;
            height: 100%;
            background-color: ${t};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 2px 0 5px rgba(0,0,0,0.2);
            position: relative;
            overflow: hidden;
        `;const i=e._backSvgDataUri||n;i&&(r.style.backgroundImage=`url("${i}")`,r.style.backgroundSize="cover",r.style.backgroundPosition="center");const a=document.createElement("div"),l=e.spineText||e.title||"";return a.textContent=l,a.style.cssText=`
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            font-family: ${s};
            font-size: 11px;
            color: ${o};
            white-space: nowrap;
            letter-spacing: 0.5px;
            text-align: center;
            max-height: 90%;
            overflow: hidden;
            text-overflow: ellipsis;
        `,/[\u0590-\u05FF]/.test(l)&&(a.style.fontFamily="'Fredoka', 'Heebo', sans-serif",a.style.direction="rtl"),r.appendChild(a),r}static createFrontCover(e,t,o){const{bgColor:s,textColor:n,titleFont:r,bodyFont:i,accentColor:a,interactive:l,layout:c,bgTextureUrl:d}=o,p=document.createElement("div");switch(p.className="cover-section front-cover",p.style.cssText=`
            flex: 1;
            height: 100%;
            position: relative;
            background-color: ${s};
            box-shadow: -3px 3px 10px rgba(0,0,0,0.4);
            border-radius: 0 2px 2px 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `,d&&(p.style.backgroundImage=`url("${d}")`,p.style.backgroundSize=e._coverGalleryId?"contain":"cover",p.style.backgroundPosition="center",p.style.backgroundRepeat="no-repeat"),e._resolvedGradientCss&&!d&&(p.style.background=e._resolvedGradientCss),e._resolvedSolidColor&&!d&&!e._resolvedGradientCss&&(p.style.backgroundColor=e._resolvedSolidColor),e._personalityCoverStyle||c){case"full-bleed":case"magazine":case"documentary":case"bold_graphic":case"contact_sheet":case"playful":this.applyFullBleedLayout(p,e,t,o);break;case"editorial":this.applyEditorialLayout(p,e,t,o);break;case"luxe":this.applyLuxeLayout(p,e,t,o);break;case"polaroid":this.applyPolaroidCoverLayout(p,e,t,o);break;case"photo-bottom":this.applyPhotoBottomLayout(p,e,t,o);break;case"centered":this.applyCenteredLayout(p,e,t,o);break;case"minimal":this.applyMinimalLayout(p,e,o);break;case"split":this.applySplitLayout(p,e,t,o);break;case"elegant":this.applyElegantLayout(p,e,t,o);break;case"custom":e.customLayout?this.applyCustomLayout(p,e,t,o):this.applyStandardLayout(p,e,t,o);break;default:this.applyStandardLayout(p,e,t,o);break}if(e.coverDecorations&&e.coverDecorations.length>0&&window.COVER_ELEMENT_LIBRARY){const g={"top-left":"top:8%;left:5%;","top-right":"top:8%;right:5%;","bottom-left":"bottom:28%;left:5%;","bottom-right":"bottom:28%;right:5%;","bottom-center":"bottom:28%;left:50%;transform:translateX(-50%);"};e.coverDecorations.forEach(m=>{const y=typeof m=="string"?m:m.id,w=(window.COVER_ELEMENT_LIBRARY.decorations||[]).find(f=>f.id===y);if(!w||!w.svg)return;const b=w.defaultSize||{w:40,h:40},v=document.createElement("div");v.className="cover-decoration-overlay",v.dataset.decoId=y,v.style.cssText=`position:absolute;width:${b.w}px;height:${b.h}px;pointer-events:none;z-index:5;opacity:0.9;${g[w.placement||"bottom-left"]||g["bottom-left"]}`,v.innerHTML=w.svg;const S=v.querySelector("svg");S&&(S.style.width="100%",S.style.height="100%"),p.appendChild(v)})}return p}static applyStandardLayout(e,t,o,s){const{interactive:n}=s,r=this.createPhotoArea(t,o,{layout:"standard",interactive:n});r.style.cssText+="flex:1;margin:10%;";const i=this.createTextArea(t,s);i.style.cssText+="padding:5% 10% 15%;",e.appendChild(r),e.appendChild(i)}static applyFullBleedLayout(e,t,o,s){const{interactive:n}=s,r=this.createPhotoArea(t,o,{layout:"full-bleed",interactive:n});r.style.cssText+="position:absolute;inset:0;";const i=document.createElement("div");i.style.cssText=["position:absolute","inset:0","z-index:5","background:linear-gradient(to bottom,","  rgba(0,0,0,0) 30%,","  rgba(0,0,0,0.18) 55%,","  rgba(0,0,0,0.72) 85%,","  rgba(0,0,0,0.85) 100%)","pointer-events:none"].join(";");const a=this.createTextArea(t,{...s,textColor:"#ffffff"});a.style.cssText+=["position:absolute","bottom:8%","left:0","right:0","z-index:10","padding:0 7%","box-sizing:border-box","text-shadow:0 1px 6px rgba(0,0,0,0.6)"].join(";"),a.querySelectorAll("*").forEach(d=>{d.style.color="#ffffff"});const l=a.querySelector('.cover-title, [class*="title"]');l&&(l.style.fontSize="clamp(22px, 5cqw, 42px)",l.style.fontWeight="700",l.style.letterSpacing="0.02em");const c=a.querySelector('.cover-subtitle, [class*="subtitle"]');c&&(c.style.opacity="0.85",c.style.fontSize="clamp(11px, 2.5cqw, 18px)",c.style.marginTop="4px"),e.appendChild(r),e.appendChild(i),e.appendChild(a)}static applyEditorialLayout(e,t,o,s){const{interactive:n}=s;!e.style.backgroundImage&&!e.style.background.includes("url")&&(e.style.backgroundColor="#faf6ee");const r=this.createPhotoArea(t,o,{layout:"standard",interactive:n});r.style.cssText+="position:absolute;top:8%;left:10%;right:10%;height:60%;",r.style.boxShadow="0 8px 40px rgba(0,0,0,0.12)";const i=this.createTextArea(t,{...s,textColor:"#1a1a1a"});i.style.cssText+="position:absolute;bottom:5%;left:0;right:0;padding:0 10%;text-align:center;",i.querySelectorAll("*").forEach(d=>{d.style.color="#1a1a1a"});const a=i.querySelector('.cover-title, [class*="title"]');a&&(a.style.fontSize="clamp(18px, 4cqw, 32px)",a.style.fontWeight="300",a.style.letterSpacing="0.1em",a.style.textTransform="none");const l=i.querySelector('.cover-subtitle, [class*="subtitle"]');l&&(l.style.fontSize="clamp(10px, 2cqw, 14px)",l.style.opacity="0.5",l.style.marginTop="8px",l.style.letterSpacing="0.2em",l.style.textTransform="uppercase");const c=document.createElement("div");c.style.cssText="width:40px;height:1px;background:#1a1a1a;opacity:0.3;margin:0 auto 12px;",e.appendChild(r),e.appendChild(c),e.appendChild(i)}static applyLuxeLayout(e,t,o,s){const{interactive:n}=s;!e.style.backgroundImage&&!e.style.background.includes("url")&&(e.style.backgroundColor="#0f172a"),e.style.outline="none";const r=document.createElement("div");r.style.cssText="position:absolute;inset:6%;border:1px solid rgba(201,168,76,0.45);pointer-events:none;z-index:20;",e.appendChild(r);const i=this.createPhotoArea(t,o,{layout:"standard",interactive:n});i.style.cssText+="position:absolute;top:12%;left:14%;right:14%;height:54%;",i.style.boxShadow="0 0 0 1px rgba(201,168,76,0.5), 0 12px 50px rgba(0,0,0,0.7)";const a=document.createElement("div");a.style.cssText="position:absolute;bottom:30%;left:30%;right:30%;height:1px;background:linear-gradient(to right,transparent,#c9a84c,transparent);z-index:5;";const l=this.createTextArea(t,{...s,textColor:"#c9a84c"});l.style.cssText+="position:absolute;bottom:8%;left:0;right:0;padding:0 12%;text-align:center;z-index:10;",l.querySelectorAll("*").forEach(p=>{p.style.color="#c9a84c",p.style.textShadow="0 1px 8px rgba(201,168,76,0.3)"});const c=l.querySelector('.cover-title, [class*="title"]');c&&(c.style.fontSize="clamp(16px, 3.5cqw, 28px)",c.style.fontWeight="300",c.style.letterSpacing="0.15em");const d=l.querySelector('.cover-subtitle, [class*="subtitle"]');d&&(d.style.fontSize="clamp(9px, 1.8cqw, 12px)",d.style.opacity="0.65",d.style.letterSpacing="0.25em",d.style.textTransform="uppercase"),e.appendChild(i),e.appendChild(a),e.appendChild(l)}static applyPolaroidCoverLayout(e,t,o,s){const{interactive:n}=s,r=this.createPhotoArea(t,o,{layout:"standard",interactive:n});r.style.cssText+="position:absolute;top:10%;left:15%;right:15%;height:58%;",r.style.transform="rotate(-1.5deg)",r.style.boxShadow="0 6px 30px rgba(0,0,0,0.25), 0 0 0 12px #fff, 0 0 0 13px rgba(0,0,0,0.08)",r.style.background="#fff",r.style.padding="4%",r.style.boxSizing="border-box";const i=this.createTextArea(t,{...s,textColor:"#2d1a0e"});i.style.cssText+="position:absolute;bottom:8%;left:0;right:0;padding:0 12%;text-align:center;",i.querySelectorAll("*").forEach(l=>{l.style.color="#2d1a0e"});const a=i.querySelector('.cover-title, [class*="title"]');a&&(a.style.fontSize="clamp(16px, 3.5cqw, 26px)",a.style.fontFamily="'Playpen Sans Hebrew', 'Amatic SC', cursive",a.style.fontWeight="600"),e.appendChild(r),e.appendChild(i)}static applyPhotoBottomLayout(e,t,o,s){const{interactive:n}=s,r=this.createTextArea(t,s);r.style.cssText+="padding:15% 10% 5%;";const i=this.createPhotoArea(t,o,{layout:"photo-bottom",interactive:n});i.style.cssText+="flex:1;margin:0 10% 10%;",e.appendChild(r),e.appendChild(i)}static applyCenteredLayout(e,t,o,s){const{interactive:n,bgColor:r}=s;e.style.justifyContent="center",e.style.alignItems="center";const i=this.createPhotoArea(t,o,{layout:"centered",interactive:n});i.style.cssText+="width:70%;height:60%;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);";const a=this.createTextArea(t,s);a.style.cssText+="margin-top:5%;",e.appendChild(i),e.appendChild(a)}static applyMinimalLayout(e,t,o){const{titleFont:s,bodyFont:n,textColor:r}=o;e.style.justifyContent="center",e.style.alignItems="center",e.style.padding="15%";const i=this.createTextArea(t,o);i.style.cssText+="text-align:center;";const a=document.createElement("div");a.style.cssText=`
            width: 60px;
            height: 2px;
            background-color: ${r};
            margin: 20px auto;
            opacity: 0.5;
        `;const l=document.createElement("div");l.style.cssText="display:flex;flex-direction:column;align-items:center;",l.appendChild(i),l.appendChild(a),e.appendChild(l)}static applySplitLayout(e,t,o,s){const{interactive:n}=s;e.style.flexDirection="row";const r=/[\u0590-\u05FF]/,a=r.test(t.title||"")||r.test(t.subtitle||"")?"right":"left",l=this.createPhotoArea(t,o,{layout:"split",interactive:n});l.style.cssText+="flex:1;height:100%;";const c=document.createElement("div");c.style.cssText="flex:1;display:flex;flex-direction:column;justify-content:center;padding:10%;";const d=this.createTextArea(t,{...s,textAlign:a});d.style.textAlign=a,c.appendChild(d),e.appendChild(l),e.appendChild(c)}static applyElegantLayout(e,t,o,s){const{interactive:n,accentColor:r,textColor:i}=s,a=document.createElement("div");a.style.cssText=`
            position: absolute;
            inset: 5%;
            border: 2px solid ${r};
            pointer-events: none;
        `,e.appendChild(a);const l=document.createElement("div");l.style.cssText=`
            position: absolute;
            inset: 7%;
            border: 1px solid ${r};
            opacity: 0.5;
            pointer-events: none;
        `,e.appendChild(l);const c=document.createElement("div");c.style.cssText=`
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 10%;
            box-sizing: border-box;
        `;const d=this.createPhotoArea(t,o,{layout:"elegant",interactive:n});d.style.cssText+="width:60%;max-height:40%;flex-shrink:0;margin-bottom:5%;";const p=this.createTextArea(t,s),u=document.createElement("div");u.style.cssText=`
            width: 80px;
            height: 2px;
            background: linear-gradient(90deg, transparent, ${r}, transparent);
            margin: 15px 0;
        `,c.appendChild(d),c.appendChild(u),c.appendChild(p),e.appendChild(c)}static applyCustomLayout(e,t,o,s){const n=t.customLayout,{interactive:r,assets:i}=s;n.backgroundType==="dark"&&(e.style.backgroundColor="#0D0D0D"),n.photoSlots&&n.photoSlots.forEach(a=>{const l=document.createElement("div");l.className="cover-photo-slot",l.style.cssText=`
                    position: absolute;
                    left: ${a.position.x};
                    top: ${a.position.y};
                    width: ${a.size.width};
                    height: ${a.size.height};
                    overflow: hidden;
                    z-index: 1;
                `,a.photoStyle;let c=null;if(!t._coverGalleryId&&t.frontPhotoId&&o?.photos){const d=o.photos.find(p=>p.id===t.frontPhotoId);d&&(c=d.thumbnailUrl||d.url)}if(c){const d=document.createElement("img");d.src=c,d.style.cssText=`
                        width: 100%;
                        height: 100%;
                        object-fit: ${a.photoFit||"cover"};
                    `,l.appendChild(d)}else l.style.backgroundColor="rgba(255,255,255,0.05)";if(a.overlay){const d=document.createElement("div");d.style.cssText=`
                        position: absolute;
                        inset: 0;
                        background: ${a.overlay};
                        z-index: 2;
                        pointer-events: none;
                    `,l.appendChild(d)}e.appendChild(l)}),n.textElements&&n.textElements.forEach(a=>{const l=document.createElement("div");l.className="cover-text-element";let c=a.content||a.placeholder||"";if(t.textContent&&t.textContent[a.elementId]!==void 0)c=t.textContent[a.elementId];else if(a.elementId==="groomName"||a.elementId==="brideName")if(t.title&&t.title.includes("&")){const f=t.title.split("&").map(x=>x.trim());a.elementId==="groomName"&&f.length>0&&(c=f[0]),a.elementId==="brideName"&&f.length>1&&(c=f[1])}else a.elementId==="groomName"&&(c="אריאל"),a.elementId==="brideName"&&(c="מיכל");else a.elementId==="title"&&t.title?c=t.title:a.elementId==="date"&&(c=t.subtitle||new Date().getFullYear());l.textContent=c;const d=a.style||{};let p="sans-serif";d.font==="hebrew"?p="'Frank Ruhl Libre', serif":d.font==="script"?p="'Pinyon Script', 'Great Vibes', cursive":d.font==="accent"?p="'Cinzel', serif":d.font==="display"?p="'Cormorant Garamond', serif":d.font==="serif"?p="'Cormorant Garamond', 'Playfair Display', serif":d.font==="sans"?p="'Montserrat', 'Open Sans', sans-serif":d.font==="body"&&(p="'Heebo', serif"),s.titleFont&&(a.elementId==="title"||a.elementId==="groomName"||a.elementId==="brideName")&&(p=s.titleFont),s.bodyFont&&(a.elementId==="date"||a.elementId==="subtitle")&&(p=s.bodyFont);let u=d.color;u==="gold"&&(u=s.accentColor||"#C9A962"),u==="light"&&(u="#FDFCFA"),u==="secondary"&&(u="#B8B0A0"),u==="primary"&&(u=s.textColor||"#000000"),s.interactive&&t._userCustomTextColor&&(u=s.textColor);const g=t.textPositions&&t.textPositions[a.elementId]?t.textPositions[a.elementId]:null,m=a.size?.width||"100%";let y=d.size||"16px";parseInt(y)>48&&(y="48px");let b=`
                    position: absolute;
                    font-family: ${p};
                    font-size: ${y};
                    font-weight: ${d.weight||400};
                    color: ${u||"white"};
                    z-index: 10;
                    box-sizing: border-box;
                    word-break: break-word;
                    overflow-wrap: break-word;
                    line-height: ${d.lineHeight||"1.3"};
                `;if(g&&g.x)b+=`
                        left: ${g.x};
                        top: ${g.y};
                        text-align: right;
                    `,g.width&&(b+=`width: ${g.width};`);else{const f=a.position.x||"0%",x=a.position.y||"0%";d.align==="center"&&f==="50%"?b+=`
                            left: 50%;
                            top: ${x};
                            transform: translateX(-50%);
                            width: ${m};
                            text-align: center;
                            letter-spacing: ${d.letterSpacing||"normal"};
                            ${a.alignment?.method||""}
                        `:b+=`
                            left: ${f};
                            top: ${x};
                            width: ${m};
                            text-align: ${d.align||"center"};
                            letter-spacing: ${d.letterSpacing||"normal"};
                            ${a.alignment?.method||""}
                        `}l.style.cssText=b,/[\u0590-\u05FF]/.test(c)&&(l.style.direction="rtl",l.style.unicodeBidi="plaintext",!p.includes("Heebo")&&!p.includes("Rubik")&&!p.includes("Frank Ruhl")&&(l.style.fontFamily="'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Heebo', sans-serif"));const S=t.textStyles&&t.textStyles[a.elementId]||{};if(S.textAlign&&l.style.setProperty("text-align",S.textAlign,"important"),S.size){const f=S.size/100,x=l.style.transform||"";l.style.transform=x?`${x} scale(${f})`:`scale(${f})`,l.style.transformOrigin="center center"}if(r&&a.editable!==!1&&(l.dataset.selectableId=a.elementId,l.dataset.selectableType="cover-text",l.style.cursor="grab",l.style.border="1px solid transparent"),!S.size&&t.textStyles&&t.textStyles[a.elementId]&&t.textStyles[a.elementId].size){const f=t.textStyles[a.elementId].size/100,x=l.style.transform||"";l.style.transform=x?`${x} scale(${f})`:`scale(${f})`,l.style.transformOrigin="center center"}e.appendChild(l)}),n.decorations&&n.decorations.forEach(a=>{if(a.type==="goldLine"){const l=document.createElement("div");l.style.cssText=`
                        position: absolute;
                        left: ${a.position.x};
                        top: ${a.position.y};
                        width: ${a.size.width};
                        height: ${a.size.height};
                        background-color: #C9A962;
                        z-index: 5;
                    `,e.appendChild(l)}})}static createPhotoArea(e,t,{layout:o,interactive:s}){const n=document.createElement("div");if(n.className="cover-photo-area",e._coverGalleryId)return n.style.cssText=`
                pointer-events: none;
            `,n;const r=e.frontCrop||{},i=r.panX!==void 0?r.panX:50,a=r.panY!==void 0?r.panY:50;if(n.style.cssText=`
            background-size: cover;
            background-position: ${i}% ${a}%;
            background-repeat: no-repeat;
        `,e.frontPhotoId&&t?.photos){const l=t.photos.find(c=>c.id===e.frontPhotoId);if(l){const c=l.thumbnailUrl||l.url;n.style.backgroundImage=`url(${c})`}}else n.style.cssText+=`
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px dashed rgba(128,128,128,0.3);
                color: rgba(128,128,128,0.5);
                font-size: 14px;
                direction: rtl;
            `,n.textContent="גרור תמונה לכריכה הקדמית";return s&&(n.dataset.selectableId="cover-photo",n.dataset.selectableType="cover-photo"),n}static createTextArea(e,t){const{textColor:o,titleFont:s,bodyFont:n,interactive:r,textAlign:i="center"}=t,a=document.createElement("div");a.className="cover-text-area",a.style.cssText=`
            text-align: ${i};
            width: 100%;
            flex-shrink: 1;
            min-height: 0;
            overflow: visible;
            position: relative;
        `;const l=document.createElement("h1");l.textContent=e.title||"Album Title",l.style.cssText=`
            margin: 0;
            font-family: ${s};
            font-size: 28px;
            font-weight: 600;
            color: ${o};
            line-height: 1.2;
            word-break: break-word;
            overflow-wrap: break-word;
        `,r&&(l.dataset.selectableId="cover-title",l.dataset.selectableType="cover-text",e.textPositions&&e.textPositions["cover-title"]&&(l.style.position="absolute",l.style.left=e.textPositions["cover-title"].x,l.style.top=e.textPositions["cover-title"].y));const c=document.createElement("h3");if(c.textContent=e.subtitle||"",c.style.cssText=`
            margin: 8px 0 0;
            font-family: ${n};
            font-size: 16px;
            font-weight: 400;
            color: ${o};
            opacity: 0.85;
        `,r&&(c.dataset.selectableId="cover-subtitle",c.dataset.selectableType="cover-text",e.textPositions&&e.textPositions["cover-subtitle"]&&(c.style.position="absolute",c.style.left=e.textPositions["cover-subtitle"].x,c.style.top=e.textPositions["cover-subtitle"].y)),e.textStyles){if(e.textStyles["cover-title"]&&e.textStyles["cover-title"].size){const g=e.textStyles["cover-title"].size/100;l.style.transform=l.style.transform&&l.style.transform!=="none"?l.style.transform+` scale(${g})`:`scale(${g})`}if(e.textStyles["cover-subtitle"]&&e.textStyles["cover-subtitle"].size){const g=e.textStyles["cover-subtitle"].size/100;c.style.transform=c.style.transform&&c.style.transform!=="none"?c.style.transform+` scale(${g})`:`scale(${g})`}}a.appendChild(l),e.subtitle&&a.appendChild(c);const d=/[\u0590-\u05FF]/,p=d.test(e.title||""),u=d.test(e.subtitle||"");return(p||u)&&(a.style.direction="rtl",i!=="center"&&(a.style.textAlign="right"),p&&(l.style.fontFamily="'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Heebo', sans-serif",l.style.direction="rtl"),u&&(c.style.fontFamily="'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Heebo', sans-serif",c.style.direction="rtl")),a}static renderThumbnail(e,t,{bgColor:o,textColor:s,titleFont:n}){const r=document.createElement("div");r.className="cover-thumbnail",r.style.cssText=`
            width: 100%;
            height: 100%;
            display: flex;
            background-color: ${o};
            position: relative;
            border-radius: 2px;
            overflow: hidden;
        `;const i=document.createElement("div");i.style.cssText=`
            width: 4px;
            height: 100%;
            background-color: ${o};
            filter: brightness(0.9);
        `;const a=document.createElement("div");if(a.style.cssText=`
            flex: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 5%;
            box-sizing: border-box;
        `,!e._coverGalleryId&&e.frontPhotoId&&t?.photos){const u=t.photos.find(g=>g.id===e.frontPhotoId);if(u){const g=document.createElement("div");g.style.cssText=`
                    width: 60%;
                    height: 50%;
                    background-image: url(${u.thumbnailUrl||u.url});
                    background-size: cover;
                    background-position: center;
                    margin-bottom: 5%;
                `,a.appendChild(g)}}const l=document.createElement("div"),c=e.title||"Cover";l.textContent=c,l.style.cssText=`
            font-family: ${n};
            font-size: 8px;
            color: ${s};
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 90%;
        `,/[\u0590-\u05FF]/.test(c)&&(l.style.direction="rtl",l.style.fontFamily="'Fredoka', 'Heebo', sans-serif"),a.appendChild(l),r.appendChild(i),r.appendChild(a);const p=document.createElement("div");return p.textContent="Cover",p.style.cssText=`
            position: absolute;
            bottom: 2px;
            right: 2px;
            font-size: 6px;
            color: ${s};
            opacity: 0.6;
        `,r.appendChild(p),r}static renderToContainer(e,t,o,s,n=!0){return this.render({cover:t,assets:o,templateConfig:s,container:e,interactive:n,thumbnail:!1})}static renderTimelineThumbnail(e,t,o){return this.render({cover:e,assets:t,templateConfig:o,container:null,interactive:!1,thumbnail:!0})}};class ht{constructor(){this.templateConfig=null,this.rendererCache={}}setTemplateConfig(e){this.templateConfig=e,console.log("[PDFCanvas] Template Config updated:",e?.templateId)}getRenderer(e){if(!this.templateConfig)return null;if(this.rendererCache[e])return this.rendererCache[e];let t=null;return e&&this.templateConfig?t=new he(this.templateConfig):t=new Ce("offscreen-render"),this.rendererCache[e]=t,t}async waitForImages(e,t=3e4){const o=e.querySelectorAll("img"),s=Array.from(o).map(n=>n.complete?Promise.resolve():new Promise((r,i)=>{const a=setTimeout(()=>{console.warn("[PDFCanvas] Image load timeout:",n.src?.substring(0,50)),r()},t);n.onload=()=>{clearTimeout(a),r()},n.onerror=()=>{clearTimeout(a),r()}}));await Promise.all(s)}async waitForBackgroundImages(e,t=1e4){const o=e.querySelectorAll("*"),s=[];for(const n of o){const i=window.getComputedStyle(n).backgroundImage;if(i&&i!=="none"&&i.startsWith("url(")){const a=i.match(/url\(["']?([^"')]+)["']?\)/);if(a&&a[1]){const l=a[1];(l.startsWith("http")||l.startsWith("data:"))&&s.push(new Promise(c=>{const d=new Image;d.crossOrigin="anonymous";const p=setTimeout(c,t);d.onload=()=>{clearTimeout(p),c()},d.onerror=()=>{clearTimeout(p),c()},d.src=l}))}}}await Promise.all(s)}createOffscreenContainer(e,t){let o=document.getElementById("pdf-offscreen-render");return o||(o=document.createElement("div"),o.id="pdf-offscreen-render",document.body.appendChild(o)),o.style.cssText=`
            position: fixed;
            left: -9999px;
            top: 0;
            width: ${e}px;
            height: ${t}px;
            background: white;
            overflow: hidden;
            z-index: -1;
        `,o.innerHTML="",o}async renderPageToCanvas(e,t){const o=this.templateConfig?.designSystem?.canvas?.width||800,s=this.templateConfig?.designSystem?.canvas?.height||600,n=this.createOffscreenContainer(o,s),r=this.getRenderer(e.templateId);r||console.log("[PDFCanvas] No template renderer for:",e.templateId,"— will use RenderEngine fallback");let i;if(e.templateId&&this.templateConfig?.pageLayouts){const l=e.rawLayoutId||e.layout?.id||e.layoutId,c=this.templateConfig.pageLayouts.find(d=>d.layoutId===l);if(c&&r.renderPage){let d=[];c.photoSlots&&e.layout&&e.layout.slots?c.photoSlots.forEach((p,u)=>{const g=e.layout.slots.find(m=>m.slotId===p.slotId||m.id&&m.id.includes(p.slotId))||e.layout.slots[u];if(g&&g.photoId&&t&&t.photos){const m=t.photos.find(y=>y.id===g.photoId);d.push(m||null)}else d.push(null)}):d=e.photos||e.elements?.filter(p=>p.type==="photo")||[],i=r.renderPage(c,d,e.textContent||{},e.textPositions||{},e),e.textStyles&&Object.entries(e.textStyles).forEach(([p,u])=>{const g=i.querySelector(`[data-selectable-id="${p}"]`);if(g&&u.size){const m=u.size/100;g.style.transform&&g.style.transform!=="none"?g.style.transform+=` scale(${m})`:(g.style.transform=`scale(${m})`,g.style.transformOrigin="center center")}}),e.layout&&e.layout.slots&&e.layout.slots.forEach((p,u)=>{const g=i.querySelectorAll(".photo-slot"),m=i.querySelector(`.photo-slot[data-selectable-id="${p.photoId}"]`)||g[u];if(m){const y=m.querySelector("img");if(y&&p.photoId&&t&&t.photos){const w=p.crop&&p.crop.panX!==void 0?p.crop.panX:50,b=p.crop&&p.crop.panY!==void 0?p.crop.panY:50,v=p.crop&&p.crop.zoom?p.crop.zoom:1,S=y.src,f=document.createElement("div");f.style.width="100%",f.style.height="100%",f.style.backgroundImage=`url("${S}")`,f.style.backgroundSize="cover",f.style.backgroundPosition=`${w}% ${b}%`,f.style.backgroundRepeat="no-repeat",f.style.transform=`scale(${v})`,f.style.transformOrigin="center center",y.style.filter&&(f.style.filter=y.style.filter),y.parentNode.replaceChild(f,y)}}}),await this._injectPageElements(e,i,o,s)}}if(!i){console.log("[PDFCanvas] Using RenderEngine fallback for page:",e.templateId||"unknown");const l=new Ce(null),c=document.createElement("div");c.style.width=`${o}px`,c.style.height=`${s}px`,c.style.position="relative",c.style.overflow="hidden";const d=t||window._magicAssets||{photos:[]};l.renderPageToContainer(e,d,c),i=c.firstChild||c,(!i||i===c)&&(i=document.createElement("div"),i.innerHTML='<div style="padding: 20px;">Page render failed</div>')}i.style.width=`${o}px`,i.style.height=`${s}px`,i.style.position="relative",i.style.overflow="hidden",i.style.boxSizing="border-box",n.appendChild(i),console.log("[PDFCanvas] Waiting for images to load..."),await this.waitForImages(i),await this.waitForBackgroundImages(i),i.querySelectorAll(".photo-slot").forEach(l=>{const c=l.querySelector("img");if(c&&c.src){const d=document.createElement("div");d.style.width="100%",d.style.height="100%",d.style.backgroundImage=`url("${c.src}")`,d.style.backgroundSize="cover",d.style.backgroundPosition=c.style.objectPosition||"50% 50%",d.style.backgroundRepeat="no-repeat",c.style.filter&&(d.style.filter=c.style.filter),c.style.transform&&(d.style.transform=c.style.transform,d.style.transformOrigin=c.style.transformOrigin||"center center"),c.parentNode.replaceChild(d,c)}}),await new Promise(l=>setTimeout(l,100)),console.log("[PDFCanvas] Capturing page with html2canvas...");try{const l=await window.html2canvas(i,{width:o,height:s,scale:2,useCORS:!0,allowTaint:!0,backgroundColor:"#ffffff",logging:!1,imageTimeout:3e4,onclone:c=>{const d=c.getElementById("pdf-offscreen-render");d&&(d.style.left="0",d.style.visibility="visible")}});return console.log("[PDFCanvas] Canvas captured:",l.width,"x",l.height),l}catch(l){return console.error("[PDFCanvas] html2canvas error:",l),null}}async _injectPageElements(e,t,o,s){if(!(!e.elements||!Array.isArray(e.elements)||e.elements.length===0)){console.log(`[PDFCanvas] Injecting ${e.elements.length} elements into page ${e.id}`);for(const n of e.elements){if(n.id&&(n.id.startsWith("text_")||n.id.startsWith("dec_")||n.id.startsWith("container_"))){console.log(`[PDFCanvas] Skipping TemplateManager element "${n.id}" — already rendered by template renderer`);continue}const r=document.createElement("div");if(r.className=`page-element element-${n.type}`,r.style.position="absolute",r.style.left=`${n.x}%`,r.style.top=`${n.y}%`,n.zIndex!==void 0&&(r.style.zIndex=n.zIndex),n.transform&&(r.style.transform=n.transform),n.type==="text"){if(n.id&&t.querySelector(`[data-selectable-id="${n.id}"]`)){console.log(`[PDFCanvas] Skipping duplicate text element "${n.id}" — already rendered by template`);continue}if(r.classList.add("text-element"),r.style.minWidth="200px",n.pixelWidth&&(r.style.width=n.pixelWidth),n.pixelHeight&&(r.style.height=n.pixelHeight),r.style.maxWidth=`${n.width||50}%`,n.zIndex||(r.style.zIndex=10),window.TEXT_STYLES){const a=window.TEXT_STYLES.find(l=>l.id===n.styleId);a&&Object.assign(r.style,a.style)}n.fontSize&&(r.style.fontSize=`${n.fontSize}px`),n.color&&(r.style.color=n.color),n.fontFamily&&(r.style.fontFamily=n.fontFamily),n.textAlign&&(r.style.textAlign=n.textAlign),r.textContent=n.content,/[\u0590-\u05FF]/.test(n.content)&&(r.style.direction="rtl",r.style.textAlign=n.textAlign||"right",r.style.unicodeBidi="plaintext",n.fontFamily||(r.style.fontFamily="'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Heebo', sans-serif"))}else if(n.type==="shape")r.classList.add("shape-element"),n.subtype&&r.classList.add(n.subtype),r.style.width=`${n.width}%`,r.style.height=`${n.height}%`,n.fill&&(r.style.backgroundColor=n.fill),n.color&&(r.style.backgroundColor=n.color),n.borderRadius&&(r.style.borderRadius=`${n.borderRadius}px`);else if(n.type==="element"){if(r.classList.add("visual-element"),r.style.width=n.pixelWidth||"100px",r.style.height=n.pixelHeight||"100px",n.url&&n.url.includes("data:image/svg+xml"))try{let a="";if(n.url.includes(";utf8,")||n.url.includes(";charset=utf-8,")){const l=n.url.indexOf(",")+1;a=decodeURIComponent(n.url.substring(l))}else if(n.url.includes(";base64,")){const l=n.url.indexOf(",")+1;a=atob(n.url.substring(l))}if(a&&a.includes("<svg")){r.innerHTML=a;const l=r.querySelector("svg");l&&(l.style.width="100%",l.style.height="100%",l.setAttribute("width","100%"),l.setAttribute("height","100%")),console.log(`[PDFCanvas] Embedded inline SVG for element ${n.id}`)}else{const l=document.createElement("img");l.src=n.url,l.style.cssText="width:100%;height:100%;",r.appendChild(l)}}catch(a){console.warn("[PDFCanvas] SVG decode error:",a);const l=document.createElement("img");l.src=n.url,l.style.cssText="width:100%;height:100%;",r.appendChild(l)}else{const a=document.createElement("img");a.src=n.url,a.crossOrigin="anonymous",a.style.cssText="width:100%;height:100%;object-fit:contain;",r.appendChild(a)}let i="";n.filterHue&&(i+=`hue-rotate(${n.filterHue}deg) `),n.filterBrightness&&n.filterBrightness!==100&&(i+=`brightness(${n.filterBrightness}%) `),n.filterShadow&&(i+=`drop-shadow(2px 4px 6px ${n.filterShadowColor||"rgba(0,0,0,0.5)"}) `),i&&(r.style.filter=i.trim())}t.appendChild(r)}}}_rasterizeSvgToCanvas(e,t,o){return new Promise(s=>{if(!e||!e.includes("data:image/svg+xml")){s(e);return}const n=new Image;n.onload=()=>{try{const r=document.createElement("canvas");r.width=t*2,r.height=o*2,r.getContext("2d").drawImage(n,0,0,r.width,r.height);const a=r.toDataURL("image/png");console.log("[PDFCanvas] Rasterized element SVG → PNG"),s(a)}catch(r){console.warn("[PDFCanvas] Element SVG rasterization error:",r),s(e)}},n.onerror=()=>{console.warn("[PDFCanvas] Element SVG load error"),s(e)},n.src=e})}async renderCoverSpreadToCanvas(e,t){const o=this.templateConfig?.designSystem?.canvas?.width||800,s=this.templateConfig?.designSystem?.canvas?.height||600,n=40,r=o*2+n,i=this.createOffscreenContainer(r,s);console.log(`[PDFCanvas] Rendering Unified Cover Spread as ${r}x${s}`);const a={...e},l=(d,p,u)=>new Promise(g=>{if(!d||!d.includes("data:image/svg+xml")){g(d);return}const m=new Image;m.onload=()=>{try{const y=document.createElement("canvas");y.width=p*2,y.height=u*2,y.getContext("2d").drawImage(m,0,0,y.width,y.height);const b=y.toDataURL("image/png");console.log(`[PDFCanvas] Rasterized SVG (${d.length} chars) → PNG (${b.length} chars)`),g(b)}catch(y){console.warn("[PDFCanvas] SVG rasterization error:",y),g(d)}},m.onerror=()=>{console.warn("[PDFCanvas] SVG load error during rasterization"),g(d)},m.src=d});if(a.background&&a.background.includes("data:image/svg+xml")){const d=o,p=s;a.background=await l(a.background,d,p),a.theme=a.background,console.log("[PDFCanvas] Front cover SVG rasterized to PNG")}a._backSvgDataUri&&a._backSvgDataUri.includes("data:image/svg+xml")&&(a._backSvgDataUri=await l(a._backSvgDataUri,o,s),console.log("[PDFCanvas] Back cover SVG rasterized to PNG"));const c=pt.render({cover:a,assets:t,templateConfig:this.templateConfig,container:null,interactive:!1});c.style.width=`${r}px`,c.style.height=`${s}px`,i.appendChild(c),await this.waitForImages(c),await this.waitForBackgroundImages(c),await new Promise(d=>setTimeout(d,500));try{const d=await window.html2canvas(c,{width:r,height:s,scale:2,useCORS:!0,allowTaint:!0,backgroundColor:"#ffffff",logging:!1}),p=2,u=document.createElement("canvas");u.width=o*p,u.height=s*p,u.getContext("2d").drawImage(d,(o+n)*p,0,o*p,s*p,0,0,o*p,s*p);const m=document.createElement("canvas");m.width=n*p,m.height=s*p,m.getContext("2d").drawImage(d,o*p,0,n*p,s*p,0,0,n*p,s*p);const w=document.createElement("canvas");return w.width=o*p,w.height=s*p,w.getContext("2d").drawImage(d,0,0,o*p,s*p,0,0,o*p,s*p),{frontCanvas:u,spineCanvas:m,backCanvas:w,spreadCanvas:d,spreadWidth:r,height:s}}catch(d){return console.error("[PDFCanvas] Cover Spread capture error:",d),null}}async generatePDF(e,t,o,s=!1){if(!window.jspdf){console.error("[PDFCanvas] jsPDF not found!"),alert("ספריית PDF חסרה. אנא רענן את הדף.");return}if(!window.html2canvas){console.error("[PDFCanvas] html2canvas not found!"),alert("ספריית Canvas חסרה. אנא רענן את הדף.");return}const{jsPDF:n}=window.jspdf;const CM=28.3465,MM=2.83465,BLmm=3,BLpt=BLmm*MM;const isPrint=s;try{let trimW,trimH;if(this.bookSizeCm){trimW=this.bookSizeCm.width*CM;trimH=this.bookSizeCm.height*CM;}else{const cw=this.templateConfig?.designSystem?.canvas?.width||800,ch=this.templateConfig?.designSystem?.canvas?.height||600;trimW=cw*.75;trimH=ch*.75;}const orient=trimW>trimH?"landscape":"portrait";const bleed=isPrint?BLpt:0;const mW=trimW+2*bleed,mH=trimH+2*bleed;console.log(`[PDFCanvas] ${isPrint?"PRINT":"PREVIEW"} | ${orient} | trim=${trimW.toFixed(1)}x${trimH.toFixed(1)}pt | media=${mW.toFixed(1)}x${mH.toFixed(1)}pt`);const doc=new n({unit:"pt",format:[mW,mH],orientation:orient});doc.setProperties({title:t?.title||"Shoso Photo Book",author:"Shoso",creator:"Shoso AI Photo Book Creator",subject:"Photo Book"});if(isPrint&&bleed>0){const TB=`${bleed.toFixed(3)} ${bleed.toFixed(3)} ${(bleed+trimW).toFixed(3)} ${(bleed+trimH).toFixed(3)}`;const BB=`0 0 ${mW.toFixed(3)} ${mH.toFixed(3)}`;const AB=`${(bleed+5*MM).toFixed(3)} ${(bleed+5*MM).toFixed(3)} ${(bleed+trimW-5*MM).toFixed(3)} ${(bleed+trimH-5*MM).toFixed(3)}`;try{doc.internal.events.subscribe("putPage",function(){doc.internal.write(`/TrimBox [${TB}]`);doc.internal.write(`/BleedBox [${BB}]`);doc.internal.write(`/ArtBox [${AB}]`);});}catch(ex){console.warn("[PDFCanvas] TrimBox injection skipped:",ex.message);}}const place=img=>doc.addImage(img,"JPEG",0,0,mW,mH,void 0,"FAST");const blank=()=>{doc.addPage([mW,mH],orient);doc.setFillColor(255,255,255);doc.rect(0,0,mW,mH,"F");};const contentPages=e.filter(v=>{const l=(v.rawLayoutId||v.layout?.id||"").toLowerCase();const pt=(v.pageType||v.layout?.pageType||"").toLowerCase();if(l.includes("cover")||pt==="cover"){console.log(`[PDFCanvas] Skip cover layout: ${l||pt}`);return false;}return true;});console.log(`[PDFCanvas] Content pages: ${contentPages.length}`);const showCover=!isPrint&&t&&(t.frontPhotoId||t.title||t.templateId||t.layout||t._coverGalleryId||t.background);const total=(showCover?2:0)+contentPages.length;let pi=0;if(showCover){this.showProgress("Rendering Cover...",pi,total);const cc=await this.renderCoverSpreadToCanvas(t,o);if(cc){place(cc.frontCanvas.toDataURL("image/jpeg",.95));pi++;doc.addPage([mW,mH],orient);place(cc.backCanvas.toDataURL("image/jpeg",.95));pi++;}}for(let i=0;i<contentPages.length;i++){this.showProgress(`מעבד עמוד ${i+1} מתוך ${contentPages.length}...`,pi+i,total);(pi>0||i>0)&&doc.addPage([mW,mH],orient);const pc=await this.renderPageToCanvas(contentPages[i],o);if(pc){place(pc.toDataURL("image/jpeg",.95));}else{doc.setFillColor(255,255,255);doc.rect(0,0,mW,mH,"F");}}if(isPrint){const np=doc.internal.getNumberOfPages();if(np%2!==0){console.log(`[PDFCanvas] Adding blank page for even count: ${np}->${np+1}`);blank();}console.log(`[PDFCanvas] Final pages: ${doc.internal.getNumberOfPages()}`);}this.hideProgress();const cont=document.getElementById("pdf-offscreen-render");cont&&cont.remove();const fn=`photo-book-${new Date().toISOString().slice(0,10)}.pdf`;if(s){const blob=new Blob([doc.output("arraybuffer")],{type:"application/pdf"});return console.log(`[PDFCanvas] Print blob: ${blob.size}B, ${doc.internal.getNumberOfPages()}pp`),blob;}doc.save(fn);this.showSuccessModal(fn);}catch(r){console.error("[PDFCanvas] PDF generation failed:",r);this.hideProgress();alert("יצירת ה-PDF נכשלה: "+r.message);}}async generateCoverPDF(cover,assets){if(!window.jspdf)return console.error("[PDFCanvas] jsPDF not found for cover PDF"),null;const {jsPDF:jsPDFCls}=window.jspdf;const CM2=28.3465,MM2=2.83465,BL2=3*MM2;let tW2,tH2;if(this.bookSizeCm){tW2=this.bookSizeCm.width*CM2;tH2=this.bookSizeCm.height*CM2;}else{const cw2=this.templateConfig?.designSystem?.canvas?.width||800,ch2=this.templateConfig?.designSystem?.canvas?.height||600;tW2=cw2*.75;tH2=ch2*.75;}const mW2=tW2*2+2*BL2,mH2=tH2+2*BL2,hw2=mW2/2;console.log("[PDFCanvas] Cover PDF (2-up) | "+tW2.toFixed(1)+"x"+tH2.toFixed(1)+"pt per side");try{const cc2=await this.renderCoverSpreadToCanvas(cover,assets);if(!cc2)return console.error("[PDFCanvas] Cover spread failed"),null;const doc2=new jsPDFCls({unit:"pt",format:[mW2,mH2],orientation:"landscape"});doc2.setProperties({title:cover&&cover.title||"Shoso Cover",author:"Shoso",creator:"Shoso AI Photo Book Creator"});const TB2=BL2.toFixed(3)+" "+BL2.toFixed(3)+" "+(BL2+tW2*2).toFixed(3)+" "+(BL2+tH2).toFixed(3);const BB2="0 0 "+mW2.toFixed(3)+" "+mH2.toFixed(3);try{doc2.internal.events.subscribe("putPage",function(){doc2.internal.write("/TrimBox ["+TB2+"]");doc2.internal.write("/BleedBox ["+BB2+"]");});}catch(e3){}doc2.addImage(cc2.frontCanvas.toDataURL("image/jpeg",.95),"JPEG",0,0,hw2,mH2,undefined,"FAST");doc2.addImage(cc2.backCanvas.toDataURL("image/jpeg",.95),"JPEG",hw2,0,hw2,mH2,undefined,"FAST");const blob2=new Blob([doc2.output("arraybuffer")],{type:"application/pdf"});console.log("[PDFCanvas] Cover PDF 2-up blob: "+blob2.size+" bytes");return blob2;}catch(err2){return console.error("[PDFCanvas] generateCoverPDF failed:",err2),null;}}showProgress(e,t,o){let s=document.getElementById("pdf-progress-overlay");if(!s){s=document.createElement("div"),s.id="pdf-progress-overlay",s.innerHTML=`
                <div class="pdf-progress-content">
                    <div class="pdf-progress-spinner"></div>
                    <div class="pdf-progress-message"></div>
                    <div class="pdf-progress-bar-container">
                        <div class="pdf-progress-bar"></div>
                    </div>
                </div>
            `,s.style.cssText=`
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;const r=document.createElement("style");r.textContent=`
                .pdf-progress-content {
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    text-align: center;
                    min-width: 300px;
                }
                .pdf-progress-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #e0e0e0;
                    border-top: 4px solid #6366f1;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .pdf-progress-message {
                    font-size: 16px;
                    color: #333;
                    margin-bottom: 16px;
                }
                .pdf-progress-bar-container {
                    height: 8px;
                    background: #e0e0e0;
                    border-radius: 4px;
                    overflow: hidden;
                }
                .pdf-progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #6366f1, #8b5cf6);
                    transition: width 0.3s ease;
                }
            `,document.head.appendChild(r),document.body.appendChild(s)}s.querySelector(".pdf-progress-message").textContent=e;const n=Math.round(t/o*100);s.querySelector(".pdf-progress-bar").style.width=`${n}%`}hideProgress(){const e=document.getElementById("pdf-progress-overlay");e&&e.remove()}showSuccessModal(e){const t=document.getElementById("pdfDownloadModal"),o=document.getElementById("btn-download-trigger");if(t&&o){const s=o.cloneNode(!0);o.parentNode.replaceChild(s,o),s.innerHTML='<i class="fa-solid fa-check"></i> Download Started',s.onclick=n=>{n.preventDefault(),t.classList.remove("active")},t.classList.add("active"),setTimeout(()=>{t.classList.remove("active")},3e3)}}showDownloadModal(e,t=null,o=null){const s=document.getElementById("pdfDownloadModal"),n=document.getElementById("btn-download-trigger"),r=o||`photo-book-${new Date().toISOString().slice(0,10)}.pdf`;if(s&&n){const i=n.cloneNode(!0);n.parentNode.replaceChild(i,n),i.onclick=a=>{a.preventDefault(),console.log(`[PDFCanvas] Button Clicked. Filename: ${r}`),console.log(`[PDFCanvas] URL MIME type check - URL: ${e.substring(0,50)}...`),i.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Downloading...';try{const l=document.createElement("a");l.style.display="none",l.href=e,l.download=r,l.type="application/pdf",document.body.appendChild(l),l.click(),console.log(`[PDFCanvas] Download triggered for ${r} (Type: application/pdf)`),setTimeout(()=>{i.innerHTML="Download PDF",document.body.contains(l)&&document.body.removeChild(l),URL.revokeObjectURL(e)},3e3)}catch(l){console.error("[PDFCanvas] Download error:",l),alert("שגיאת הורדה: "+l.message),i.innerHTML="הורד PDF"}},s.classList.add("active")}else{const i=document.createElement("a");i.href=e,i.download=r,document.body.appendChild(i),i.click(),document.body.removeChild(i),setTimeout(()=>URL.revokeObjectURL(e),6e4)}}triggerDownload(e,t){const o=document.createElement("a");o.href=e,o.download=t,document.body.appendChild(o),o.click(),document.body.removeChild(o)}}const se=new ht;class ut{constructor(){this.pollingInterval=null}async openPicker(){const e=document.getElementById("google-photos-loader"),t=document.querySelector("#google-photos-loader .loader-progress-fill");return new Promise(async(o,s)=>{try{const n=J.getCurrentUser();if(!n)return e&&e.classList.remove("active"),s("User not logged in");t&&(t.style.width="20%");const r=J.getFunctions(),i=r.httpsCallable("createPickerSession");let a=await i({});if(t&&(t.style.width="30%"),a.data.status==="AUTH_REQUIRED"&&a.data.authUrl){console.log("Server-side Google Auth required. Opening popup...");let S=null;await new Promise((f,x)=>{const E=(window.screen.width-600)/2,T=(window.screen.height-700)/2,k=window.open(a.data.authUrl,"Google Photos Auth",`width=600,height=700,top=${T},left=${E},resizable=yes,scrollbars=yes,status=yes`);if(!k||k.closed||typeof k.closed>"u")return console.warn("Popup might be blocked."),alert("אנא אפשר חלונות קופצים (popups) לאתר זה."),x(new Error("Popup blocked."));S=k;const L=Y=>{Y.data&&Y.data.type==="GOOGLE_PHOTOS_AUTH_SUCCESS"&&($(),Y.data.success?(console.log("[GooglePhotos] Auth success signal via postMessage"),f()):(k.close(),x(new Error("Auth failed: "+Y.data.result?.message))))};window.addEventListener("message",L);const _=J.getDB();let R=null;n&&(R=_.collection("oauth_tokens").doc(n.uid).onSnapshot(Y=>{Y.exists&&($(),f())},Y=>{console.warn("[GooglePhotos] Firestore listener error:",Y)}));function $(){window.removeEventListener("message",L),R&&R(),B&&clearInterval(B)}const B=setInterval(()=>{k.closed&&setTimeout(()=>{$(),f()},1e3)},1e3)}),t&&(t.style.width="40%");for(let f=0;f<5&&(f>0&&await new Promise(x=>setTimeout(x,1e3)),a=await i({}),!(a.data.status==="SUCCESS"||a.data.status!=="AUTH_REQUIRED"));f++);}const{pickerUri:l,sessionId:c}=a.data;if(!l||!c){if(e&&e.classList.remove("active"),a.data.status==="PHOTOS_NOT_ACTIVE")throw new Error(a.data.message||"Google Photos account not active.");return o([])}t&&(t.style.width="50%");const d=800,p=650,u=(window.screen.width-d)/2,g=(window.screen.height-p)/2;let m=null;if(a.data.status==="AUTH_REQUIRED"||document.activeElement,typeof activeAuthPopup<"u"&&activeAuthPopup&&!activeAuthPopup.closed?(m=activeAuthPopup,m.location.href=l):m=window.open(l,"Google Photos Picker",`width=${d},height=${p},top=${g},left=${u},resizable=yes,scrollbars=yes,status=yes`),!m)return e&&e.classList.remove("active"),s("חלון קופץ נחסם. אנא אפשר חלונות קופצים לאתר זה.");const y=r.httpsCallable("checkPickerSession"),w=Date.now();let b=!1;this.pollingInterval=setInterval(async()=>{const S=Date.now()-w;if(m.closed&&!b)if(S<3e3)b=!0;else{clearInterval(this.pollingInterval);let f=!1;try{const x=await y({sessionId:c});x?.data?.complete&&(await v(x.data),f=!0)}catch{}f||(e&&e.classList.remove("active"),o([]));return}if(Date.now()-w>12e4){clearInterval(this.pollingInterval),m.closed||m.close(),e&&e.classList.remove("active"),s(new Error("Picker timed out"));return}try{const x=(await y({sessionId:c})).data;x.complete?(clearInterval(this.pollingInterval),m.closed||m.close(),t&&(t.style.width="70%"),await v(x)):x.error&&(clearInterval(this.pollingInterval),m.closed||m.close(),e&&e.classList.remove("active"),s(new Error(x.error)))}catch{}},2e3);const v=async S=>{let f=(S.photos||[]).map(x=>{const C=x.baseUrl;let I=C;return C.includes("=w")||C.includes("=h")||C.includes("=s")?I=C.split("=")[0]+"=d":I=C+"=d",{id:x.id,url:I,thumbnailUrl:null,rawBaseUrl:x.baseUrl,name:x.filename||"Google Photo",source:"google-photos",ratio:1}});if(f.length>0){e&&e.classList.add("active"),t&&(t.style.width="40%");try{const x=r.httpsCallable("fetchThumbnailBatch"),C=f.map(T=>T.rawBaseUrl),I=10,E={};for(let T=0;T<C.length;T+=I){const k=C.slice(T,T+I);if(t){const L=80+T/C.length*20;t.style.width=`${L}%`}try{const L=await x({baseUrls:k});L.data&&L.data.thumbnails&&L.data.thumbnails.forEach(_=>{_.thumbnailUrl&&(E[_.baseUrl]=_.thumbnailUrl)})}catch(L){console.error(L)}}f=f.map(T=>({...T,thumbnailUrl:E[T.rawBaseUrl]||"data:image/svg+xml;base64,...(error)"}))}catch(x){console.error(x)}}t&&(t.style.width="100%"),setTimeout(()=>{e&&e.classList.remove("active")},500),console.log("Resolving with photos:",f),o(f)}}catch(n){e&&e.classList.remove("active"),console.error("Picker Session Error:",n),s(n)}})}async fetchHighResImage(e){try{const s=await J.getFunctions().httpsCallable("fetchHighResImage")({url:e});if(s.data&&s.data.success&&s.data.dataUri)return s.data.dataUri;throw new Error(s.data.error||"Failed to fetch")}catch(t){throw console.error("Proxy Fetch Error:",t),t}}async refreshMediaItemUrls(e,t){try{const n=await J.getFunctions().httpsCallable("refreshMediaItemUrls")({mediaItemIds:t});if(n.data&&n.data.results){const r={};return n.data.results.forEach(i=>{i.mediaItem&&(r[i.mediaItem.id]=i.mediaItem.baseUrl)}),{success:!0,urls:r}}return{success:!1}}catch(o){throw console.error("Refresh URLs Failed:",o),o}}async connect(){return Promise.resolve(!0)}}const be=new ut;class gt{constructor(e={}){this.apiKey=e.apiKey||null,this.baseUrl="https://generativelanguage.googleapis.com/v1beta",this.models={FAST:"gemini-2.5-flash-image",PRO:"gemini-3-pro-image-preview"},this.rateLimiter=new ft(15,6e4)}setApiKey(e){this.apiKey=e}init(e){this.setApiKey(e)}async generateContent(e){const{model:t,contents:o,imageConfig:s}=e;if(!this.apiKey)throw new Error("API key not configured");await this.rateLimiter.acquire();const n=await fetch(`${this.baseUrl}/models/${t}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":this.apiKey},body:JSON.stringify({contents:Array.isArray(o)?o:[{parts:o}],generationConfig:{responseModalities:["TEXT","IMAGE"],...s&&{imageConfig:s}}})});if(!n.ok){const r=await n.json();throw new Error(r.error?.message||"API request failed")}return n.json()}async analyzePhoto(e,t="image/jpeg"){const s=await this.generateContent({model:this.models.FAST,contents:[{text:`Analyze this photo and return JSON:
{
  "faces": { "count": number, "descriptions": [] },
  "scene": { "type": "indoor|outdoor|event|portrait", "description": "" },
  "colors": { "dominant": ["#hex"], "mood": "warm|cool|neutral" },
  "quality": { "score": 1-100, "issues": [] },
  "tags": []
}
Return ONLY valid JSON.`},{inlineData:{mimeType:t,data:e}}]});return this.parseJsonResponse(s)}async analyzePhotoDeep(e){return this.analyzePhoto(e)}async planAlbumStructure(e,t,o){return{albumId:`album_${Date.now()}`,meta:{totalPages:Math.ceil(o/4)},chapters:[],pageAssignments:[],designSystem:{mood:"mock"}}}async designPage(e){return{layout:{gridType:"grid",photoSlots:[]},background:{type:"solid",color:"#fff"}}}async generateBackgroundSafe(e,t){try{const o=await this.generateBackground("style",["#fff"],"mood");return o.base64?`data:image/png;base64,${o.base64}`:null}catch{return null}}async generateAlbumPage(e,t,o="content"){const s=e.map(i=>({inlineData:{mimeType:i.mimeType||"image/jpeg",data:i.base64}})),n=`Create a professional ${o} album page.
Design: ${t}
Photos: ${e.length}
Requirements:
- Arrange photos harmoniously
- Add appropriate backgrounds
- Include subtle frames
- Professional print quality`,r=await this.generateContent({model:this.models.PRO,contents:[{text:n},...s],imageConfig:{aspectRatio:"3:2",imageSize:"2K"}});return this.extractImage(r)}async generateBackground(e,t,o){const s=`Generate a subtle album page background.
Style: ${e}
Colors: ${t.join(", ")}
Mood: ${o}
Requirements: Subtle, professional, won't compete with photos`,n=await this.generateContent({model:this.models.FAST,contents:[{text:s}],imageConfig:{aspectRatio:"3:2",imageSize:"2K"}});return this.extractImage(n)}async applyFrame(e,t,o){const s=`Add a ${t} frame to this photo.
Colors: ${o.join(", ")}
Keep the photo intact, add decorative frame around it.`,n=await this.generateContent({model:this.models.FAST,contents:[{text:s},{inlineData:{mimeType:"image/jpeg",data:e}}]});return this.extractImage(n)}parseJsonResponse(e){const t=e.candidates?.[0]?.content?.parts?.find(s=>s.text)?.text;if(!t)throw new Error("No text in response");const o=t.match(/```json\n?([\s\S]*?)\n?```/)||[null,t];return JSON.parse(o[1]||t)}extractImage(e){const t=e.candidates?.[0]?.content?.parts?.find(o=>o.inlineData);if(!t)throw new Error("No image in response");return{base64:t.inlineData.data,mimeType:t.inlineData.mimeType||"image/png"}}}class ft{constructor(e,t){this.maxRequests=e,this.windowMs=t,this.requests=[]}async acquire(){const e=Date.now();if(this.requests=this.requests.filter(t=>e-t<this.windowMs),this.requests.length>=this.maxRequests){const t=this.requests[0]+this.windowMs-e;return await new Promise(o=>setTimeout(o,t)),this.acquire()}this.requests.push(e)}}const ie=new gt,mt="AeaBp323CjqYmHp-xUAI75zxRjYdV-zZBX9qoxbipdeQooVrakI7aAdfbPizQ3QmsUe0MjZ-4X71PuiC";function yt(){return new Promise((P,e)=>{if(window.paypal){P(window.paypal);return}const t=document.createElement("script");t.src=`https://www.paypal.com/sdk/js?client-id=${mt}&currency=ILS`,t.onload=()=>P(window.paypal),t.onerror=e,document.head.appendChild(t)})}const bt={MOCK_MODE:!1,async startOrderFlow(P){let e=window.app.state,t=e.user;if(!t){const d=document.createElement("div");return d.innerHTML=`
                <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(5px); direction: rtl; font-family: 'Inter', sans-serif;">
                    <div style="background:#1e1e1e; padding:40px; border-radius:12px; border: 1px solid #333; color:white; text-align:center; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                        <i class="fa-solid fa-user-lock fa-3x" style="color: #4285F4; margin-bottom: 20px;"></i>
                        <h2 style="margin-bottom:15px; font-weight: 600;">התחברות חובה להמשך</h2>
                        <p style="margin-bottom:25px; color: #aaa; line-height: 1.5;">כדי שנוכל לשמור את פרטי ההזמנה שלך, לעקוב אחר המשלוח ולעדכן אותך במייל – עליך להתחבר למערכת.</p>
                        <button id="btn-force-login" style="background:#4285F4; color:white; border:none; padding:12px 24px; border-radius:8px; font-size:16px; font-weight: 500; cursor:pointer; width: 100%; transition: background 0.2s;">
                            <i class="fa-brands fa-google" style="margin-left: 8px;"></i> התחבר עם Google
                        </button>
                        <button id="btn-force-cancel" style="background:transparent; color:#888; margin-top:20px; border:none; cursor:pointer; font-size: 14px; text-decoration: underline;">חזור לעריכה</button>
                    </div>
                </div>
            `,document.body.appendChild(d),new Promise(p=>{document.getElementById("btn-force-login").addEventListener("click",async()=>{document.body.removeChild(d);try{const{authService:u}=await ne(async()=>{const{authService:g}=await Promise.resolve().then(()=>me);return{authService:g}},void 0);await u.signInWithGoogle(),await new Promise(g=>setTimeout(g,1e3)),p(this.startOrderFlow(P))}catch(u){console.error(u),alert("ההתחברות נכשלה, אנא נסה שוב."),p()}}),document.getElementById("btn-force-cancel").addEventListener("click",()=>{document.body.removeChild(d),p()})})}const o=e.pages.length||20,s=119,n=5,r=Math.max(0,o-20),i=s+r*n,a=25,l=i+a;this.currentOrder={bookPrice:i,shipping:a,total:l,currency:"ILS",pageCount:o,pdfBlob:P};const c=this.createOverlay();document.body.appendChild(c);try{const d=await this.uploadPdfToStorage(P,t?.uid||"anon",p=>{const u=document.getElementById("upload-progress");u&&(u.style.width=`${p}%`)});await this.showPaymentUI(c,d)}catch(d){console.error("Order Flow Error:",d),alert("שגיאה בעיבוד ההזמנה: "+d.message),document.body.removeChild(c)}},createOverlay(){const P=document.createElement("div");return P.id="order-overlay",Object.assign(P.style,{position:"fixed",top:"0",left:"0",width:"100%",height:"100%",backgroundColor:"rgba(0,0,0,0.9)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:"9999",color:"white",fontFamily:'"Inter", sans-serif'}),P.innerHTML=`
            <div id="upload-stage" style="text-align:center;">
                <i class="fa-solid fa-cloud-arrow-up fa-3x fa-bounce" style="margin-bottom:20px;"></i>
                <h2>Uploading Your Album...</h2>
                <p>Securing your memories in the cloud.</p>
                <div style="width: 300px; height: 6px; background: #333; margin: 20px auto; border-radius: 3px; overflow: hidden;">
                    <div id="upload-progress" style="width: 0%; height: 100%; background: #4285F4; transition: width 0.3s;"></div>
                </div>
            </div>
            <div id="payment-stage" style="display:none; text-align:center; width: 100%; max-width: 500px;">
                <!-- Payment UI injected here -->
            </div>
        `,P},async uploadPdfToStorage(P,e,t,suffix="album"){if(this.MOCK_MODE){console.log(`[OrderFlow] Mock Uploading PDF (${suffix})...`);for(let i=0;i<=100;i+=10)t(i),await new Promise(a=>setTimeout(a,100));return`https://mock-storage.com/${suffix}.pdf`}const o=Date.now(),s=`orders/${e}/${o}_${suffix}.pdf`,r=firebase.storage().ref().child(s).put(P);return new Promise((i,a)=>{r.on("state_changed",l=>{const c=l.bytesTransferred/l.totalBytes*100;t(c)},l=>a(l),async()=>{const l=await r.snapshot.ref.getDownloadURL();i(l)})})},async showPaymentUI(P,e){const t=this.currentOrder,o=P.querySelector("#upload-stage"),s=P.querySelector("#payment-stage");o.style.display="none",s.style.display="block",s.style.maxWidth="600px";let n={};if(window.app.state.user)try{const{authService:u}=await ne(async()=>{const{authService:y}=await Promise.resolve().then(()=>me);return{authService:y}},void 0),m=await u.getDB().collection("users").doc(window.app.state.user.uid).get();m.exists&&m.data().shippingAddress&&(n=m.data().shippingAddress)}catch(u){console.error("Failed to load saved address",u)}const r=()=>{const u=document.getElementById("ship-method")?.value||"2";let g=u==="2"?25:0;const m=document.getElementById("ui-total-price"),y=document.getElementById("ui-shipping-price");t.shipping=g,t.total=t.bookPrice+t.shipping,y&&(y.textContent=`₪${t.shipping.toFixed(2)}`),m&&(m.textContent=`₪${t.total.toFixed(2)}`);const w=document.getElementById("pickup-point-container");w&&(w.style.display=u==="1"?"block":"none")};s.innerHTML=`
            <div style="background: #1a1a1a; padding: 30px; border-radius: 12px; border: 1px solid #333; text-align: right; direction: rtl; max-height: 85vh; overflow-y: auto;">
                <h2 style="margin-bottom: 20px; text-align: center;">סקירה והזמנה נשלחת להדפסה</h2>
                
                <!-- BookPod Options -->
                <div style="background: #222; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px; color: #ccc;"><i class="fa-solid fa-book-open"></i> הגדרות הפקה (Bookpod)</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">סוג דפים</label>
                            <select id="book-paper-type" style="width:100%; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                                <option value="chromo170">כרומו לבן לח ליין 170 גרם (קלאסי)</option>
                                <option value="chromo130">מט פרימיום 130 גרם</option>
                            </select>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">למינציה בכריכה</label>
                            <select id="book-lamination" style="width:100%; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                                <option value="none" selected>ללא למינציה (מראה טבעי)</option>
                                <option value="flat">מבריק (Flat)</option>
                                <option value="matt">מט (Matt)</option>
                            </select>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">רוחב ספר (ס"מ)</label>
                            <select id="book-width" style="width:100%; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                                <option value="10.5">10.5</option>
                                <option value="11">11</option>
                                <option value="12">12</option>
                                <option value="13">13</option>
                                <option value="14">14</option>
                                <option value="14.8">14.8</option>
                                <option value="15">15</option>
                                <option value="16">16</option>
                                <option value="17">17</option>
                                <option value="18">18</option>
                                <option value="19">19</option>
                                <option value="20" selected>20</option>
                                <option value="21">21</option>
                                <option value="22">22</option>
                            </select>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">גובה ספר (ס"מ)</label>
                            <select id="book-height" style="width:100%; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                                <option value="14.8">14.8</option>
                                <option value="15">15</option>
                                <option value="16">16</option>
                                <option value="17">17</option>
                                <option value="18">18</option>
                                <option value="19">19</option>
                                <option value="20" selected>20</option>
                                <option value="21">21</option>
                                <option value="22">22</option>
                                <option value="23">23</option>
                                <option value="24">24</option>
                                <option value="25">25</option>
                                <option value="26">26</option>
                                <option value="27">27</option>
                                <option value="28">28</option>
                                <option value="29">29</option>
                                <option value="29.7">29.7</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Shipping Form -->
                <div style="background: #222; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px; color: #ccc;"><i class="fa-solid fa-truck"></i> פרטי משלוח</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <input type="text" id="ship-name" placeholder="שם מלא" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${n.name||window.app.state.user?.displayName||""}">
                        <input type="email" id="ship-email" placeholder="אימייל" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${n.email||window.app.state.user?.email||""}">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <input type="tel" id="ship-phone" placeholder="טלפון מדוייק (חובה)" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${n.phoneNumber||""}">
                        <input type="text" id="ship-city" placeholder="עיר מגורים" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${n.city||""}">
                    </div>
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <input type="text" id="ship-street" placeholder="רחוב" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${n.street||""}">
                        <input type="text" id="ship-house" placeholder="מס' בניין" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${n.house||""}">
                        <input type="text" id="ship-apartment" placeholder="דירה" title="דירה" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${n.apartment||""}">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 10px;">
                        <input type="text" id="ship-zip" placeholder="מיקוד (אופציונלי)" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${n.zipCode||""}">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">שיטת משלוח</label>
                        <select id="ship-method" style="width:100%; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                            <option value="2" selected>שליח עד הבית (₪25)</option>
                            <option value="1">נקודת איסוף K.Express (₪0)</option>
                            <option value="3">איסוף עצמי מהמפעל (₪0)</option>
                        </select>
                    </div>
                    <div id="pickup-point-container" style="display:none; margin-top: 10px;">
                        <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">בחירת נקודת חלוקה</label>
                        <div style="display: flex; gap: 8px;">
                            <button id="btn-fetch-points" type="button" style="padding:8px 12px; border-radius:4px; border:none; background:#4285f4; color:white; cursor:pointer; font-family: 'Inter', sans-serif;">חפש נקודות</button>
                            <select id="ship-pickup-point" style="flex:1; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white; max-width: 300px;">
                                <option value="">יש לחפש ולבחור נקודה</option>
                            </select>
                        </div>
                        <div id="pickup-point-loading" style="display:none; color:#aaa; font-size:12px; margin-top:4px;">מחפש נקודות קרובות...</div>
                    </div>
                </div>

                <div style="text-align:right; background: #333; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                        <span>₪${t.bookPrice.toFixed(2)}</span>
                        <span>אלבום כריכה קשה (≈20x20 ס״מ)</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                        <span id="ui-shipping-price">₪${t.shipping.toFixed(2)}</span>
                        <span>דמי משלוח</span>
                    </div>
                    <div style="border-top: 1px solid #555; margin: 10px 0;"></div>
                    <div style="display:flex; justify-content:space-between; font-weight: bold; font-size: 1.2em; color: #6366f1;">
                        <span id="ui-total-price">₪${t.total.toFixed(2)}</span>
                        <span>סה״כ לתשלום</span>
                    </div>
                </div>
                
                <div id="paypal-button-container" style="direction: ltr;"></div>

                ${this.MOCK_MODE?`
                <div style="margin-top: 20px; border-top: 1px dashed #555; padding-top: 20px;">
                    <p style="color: #eda50d; font-size: 0.9em; margin-bottom: 10px; text-align: center;">🚧 מצב הדגמה פעיל</p>
                    <button id="btn-mock-pay" style="width: 100%; background: #eda50d; color: black; font-weight: bold; padding: 12px; border: none; border-radius: 4px; cursor: pointer;">
                        Simulate Payment Success (Test)
                    </button>
                    <div style="margin-top: 10px; font-size: 0.8em; color: #888; text-align: center;">
                        הזמנה תישלח ל-API הוירטואלי של בוקפוד.
                    </div>
                </div>
                `:""}
                
                <div style="text-align: center;">
                    <button id="btn-cancel-order" style="background: transparent; color: #888; border: none; margin-top: 20px; cursor: pointer; text-decoration: underline; font-family: 'Inter', sans-serif;">
                        ביטול וחזרה
                    </button>
                </div>
            </div>
        `;const i=document.getElementById("ship-method"),a=document.getElementById("ship-city"),l=document.getElementById("ship-street"),c=document.getElementById("btn-fetch-points");i.addEventListener("change",u=>{r(),u.target.value==="1"&&a.value.trim()&&c.click()});const d=()=>{i.value==="1"&&a.value.trim()&&c.click()};a.addEventListener("blur",d),l.addEventListener("blur",d),document.getElementById("btn-cancel-order").addEventListener("click",()=>{document.body.removeChild(P)}),document.getElementById("btn-fetch-points").addEventListener("click",async()=>{const u=document.getElementById("ship-city").value.trim(),g=document.getElementById("ship-street").value.trim(),m=document.getElementById("pickup-point-loading"),y=document.getElementById("ship-pickup-point");if(!u){alert("אנא הזן עיר מגורים כדי לחפש נקודות איסוף.");return}try{m.style.display="block";const v=(await firebase.functions().httpsCallable("bookpodSearchPickupPoints")({address:{city:u,address1:g}})).data.pickupPoints||[];y.innerHTML="",v.length===0?y.innerHTML='<option value="">לא נמצאו נקודות, נסה שנית.</option>':v.forEach(S=>{const f=document.createElement("option");f.value=S.id||S.n_code,f.textContent=`${S.name} - ${S.city}, ${S.street} ${S.house||""}`,y.appendChild(f)})}catch(w){console.error("Failed to fetch pickup points:",w),alert("שגיאה בחיפוש נקודות איסוף.")}finally{m.style.display="none"}});const p=()=>{const u=document.getElementById("ship-name").value.trim(),g=document.getElementById("ship-phone").value.trim(),m=document.getElementById("ship-email").value.trim(),y=document.getElementById("ship-city").value.trim(),w=document.getElementById("ship-street").value.trim(),b=document.getElementById("ship-house").value.trim(),v=document.getElementById("ship-apartment").value.trim(),S=document.getElementById("ship-zip").value.trim(),f=document.getElementById("ship-method").value,x=document.getElementById("ship-pickup-point")?.value,C=document.getElementById("book-paper-type").value,I=document.getElementById("book-lamination").value;return!u||!g||!y?(alert("אנא מלא את כל פרטי המשלוח (שם עיר וטלפון חובה)."),null):f==="2"&&(!w||!b)?(alert("במשלוח עד הבית חובה להזין רחוב ומספר בית."),null):f==="1"&&!x?(alert("אנא בחר נקודת איסוף."),null):{shipping:{name:u,phoneNumber:g,email:m,city:y,street:w,house:b,apartment:v,zipCode:S,shippingMethod:parseInt(f,10),pickupPoint:f==="1"?x:void 0,reference_num1:"REF_"+Date.now()},bookpod:{printcolor:"color",sheettype:C,laminationtype:I,finishtype:"soft",width:parseFloat(document.getElementById("book-width")?.value||"20"),height:parseFloat(document.getElementById("book-height")?.value||"20"),readingdirection:window.app?.state?.language==="en"?"left":"right",bleed:!0}}};if(this.MOCK_MODE){document.getElementById("btn-mock-pay").addEventListener("click",async()=>{const u=p();u&&await this.handleOrderSuccess(s,"MOCK-ORDER-ID-12345",e,u)});return}await yt(),paypal.Buttons({createOrder:async(u,g)=>{const m=p();if(!m)throw new Error("Validation Failed");try{window._finalPdfUrl=e;const wCm=m.bookpod.width,hCm=m.bookpod.height;if(window.pdfCanvasExport?.setBookSizeCm){window.pdfCanvasExport.setBookSizeCm(wCm,hCm);const _tmCfg=window.app?.templateSidebar?.manager?.config;if(_tmCfg&&window.pdfCanvasExport.setTemplateConfig)window.pdfCanvasExport.setTemplateConfig(_tmCfg);const uid_co=window.app?.state?.user?.uid||"anon";try{const nb=await window.pdfCanvasExport.generatePDF(window.app.state.pages,window.app.state.cover,window.app.state.assets,true);if(nb){window._finalPdfUrl=await this.uploadPdfToStorage(nb,uid_co,()=>{});}}catch(rErr){console.warn("[OrderFlow] PDF regen failed:",rErr);}try{if(window.pdfCanvasExport.generateCoverPDF){const cb=await window.pdfCanvasExport.generateCoverPDF(window.app.state.cover,window.app.state.assets);if(cb){window._finalCoverPdfUrl=await this.uploadPdfToStorage(cb,uid_co,()=>{},"cover");console.log("[OrderFlow] Cover PDF uploaded:",window._finalCoverPdfUrl);}}}catch(cvErr){console.warn("[OrderFlow] Cover PDF failed:",cvErr);}}const w=await firebase.functions().httpsCallable("createPayPalOrder")({amount:t.total.toFixed(2),currency:t.currency});return window._currentCheckoutFormData=m,w.data.id}catch(y){throw console.error("Create Order Error:",y),alert("לא ניתן לאתחל את התשלום. אנא נסה שוב."),y}},onApprove:async(u,g)=>{await this.handleOrderSuccess(s,u.orderID,window._finalPdfUrl||e,window._currentCheckoutFormData,window._finalCoverPdfUrl||null)},onError:u=>{u.message!=="Validation Failed"&&(console.error("PayPal Error:",u),alert("שגיאת תשלום PayPal. אנא נסה שוב."))}}).render("#paypal-button-container")},async saveAddressToProfile(P){if(!P||!P.shipping)return;const e=window.app.state.user;if(e)try{const{authService:t}=await ne(async()=>{const{authService:s}=await Promise.resolve().then(()=>me);return{authService:s}},void 0);await t.getDB().collection("users").doc(e.uid).set({shippingAddress:{name:P.shipping.name||"",phoneNumber:P.shipping.phoneNumber||"",email:P.shipping.email||"",city:P.shipping.city||"",street:P.shipping.street||"",house:P.shipping.house||"",apartment:P.shipping.apartment||"",zipCode:P.shipping.zipCode||""}},{merge:!0})}catch(t){console.warn("Could not save address locally:",t)}},async handleOrderSuccess(P,e,t,o,coverPdfUrl=null){P.innerHTML=`
            <div style="padding: 40px; text-align: center; direction: rtl;">
                <i class="fa-solid fa-circle-notch fa-spin fa-3x" style="color: #4285F4; margin-bottom: 20px;"></i>
                <h3 style="margin-bottom:10px;">מעבד תשלום ושולח לדפוס...</h3>
                <p>אנא המתן בזמן שאנו סוגרים את ההזמנה שלך מול המפעל (Bookpod).</p>
            </div>
        `;try{if(await this.saveAddressToProfile(o),this.MOCK_MODE){console.log("[OrderFlow] Mocking Capture & Bookpod API..."),await new Promise(l=>setTimeout(l,2e3));const a={title:window.app.state.cover?.title||"My Photo Book",pages:window.app.state.pages.length,cover:window.app.state.cover,pdfUrl:t,shippingDraft:o.shipping,productionDraft:o.bookpod};console.log("--------------- BOOKPOD API PAYLOAD (MOCK) ---------------"),console.log(JSON.stringify(a,null,2)),console.log("----------------------------------------------------------"),this.renderSuccessUI(P,e);return}const s=firebase.functions().httpsCallable("capturePayPalOrder"),n={title:window.app.state.cover?.title||"My Photo Book",pages:window.app.state.pages,cover:window.app.state.cover,bookpodPrint:o.bookpod,coverPdfUrl:coverPdfUrl||null},r={quantity:1,totalprice:this.currentOrder.total,shippingDetails:o.shipping,invoiceUrl:t},i=await s({orderId:e,bookData:n,pdfDownloadUrl:t,orderDraft:r});if(i.data.success)this.renderSuccessUI(P,e);else throw new Error(i.data.error||"Unknown error during fulfillment API.")}catch(s){console.error("Capture Error:",s),P.innerHTML=`
                <div style="padding: 40px; text-align: center; direction: rtl;">
                    <i class="fa-solid fa-circle-exclamation fa-3x" style="color: #e74c3c; margin-bottom: 20px;"></i>
                    <h3>שגיאה בחיוב</h3>
                    <p>${s.message}</p>
                    <button onclick="document.body.removeChild(document.getElementById('order-overlay'))" style="margin-top:20px; padding:10px 20px; border:none; background:#333; color:white; border-radius:5px; cursor:pointer;">
                        סגור וחזור לעורך
                    </button>
                </div>
            `}},renderSuccessUI(P,e="MOCK"){P.innerHTML=`
            <div style="padding: 40px; text-align: center; direction: rtl;">
                <i class="fa-solid fa-check-circle fa-4x" style="color: #27ae60; margin-bottom: 20px;"></i>
                <h3 style="margin-bottom: 10px;">ההזמנה הושלמה בהצלחה!</h3>
                <p>תודה רבה! האלבום שלך בדרך לדפוס.</p>
                <div style="margin-top: 15px; font-size: 0.9em; color: #888; background: #222; padding: 10px; border-radius: 4px; border: 1px solid #444;">
                    מספר הזמנה: #${e.includes("MOCK")?Math.floor(Math.random()*1e6):e}<br>
                    <span style="color: #4285F4; font-weight: bold; display: block; margin-top: 5px;">הועבר לייצור Bookpod</span>
                </div>
                <button onclick="location.reload()" style="margin-top:20px; padding:12px 24px; border:none; background:#6366f1; color:white; border-radius:5px; cursor:pointer; font-weight: bold; font-family: 'Inter', sans-serif;">
                    צור אלבום נוסף
                </button>
            </div>
        `}},vt={apiKey:"AIzaSyCnrmoGSaebSk03F6dzAUOj5-3okolxwb0",authDomain:"shoso-photobook.firebaseapp.com",projectId:"shoso-photobook",storageBucket:"shoso-photobook.firebasestorage.app",messagingSenderId:"982613325804",appId:"1:982613325804:web:d778a62a1fc8107045f2c9",measurementId:"G-6B8BJBPY2V"};firebase.apps.length||(firebase.initializeApp(vt),console.log("Firebase Initialized in AI Editor - FORCE PRODUCTION MODE"));const le=firebase.auth(),xt=firebase.firestore(),wt=firebase.storage(),Ct=firebase.functions(),G={async signInWithGoogle(){const P=new firebase.auth.GoogleAuthProvider;try{return(await le.signInWithPopup(P)).user}catch(e){throw console.error("Login Failed:",e),e}},async signOut(){try{await le.signOut()}catch(P){console.error("Logout Failed:",P)}},onAuthStateChanged(P){return le.onAuthStateChanged(P)},getCurrentUser(){return le.currentUser},getDB(){return xt},getStorage(){return wt},getFunctions(){return Ct}},ue=new Promise((P,e)=>{const t=indexedDB.open("ShosoProjectsDB",1);t.onerror=o=>e("IndexedDB error: "+o.target.errorCode),t.onsuccess=o=>P(o.target.result),t.onupgradeneeded=o=>{const s=o.target.result;s.objectStoreNames.contains("projects")||s.createObjectStore("projects",{keyPath:"id"})}});async function ke(P){const e=await ue;return new Promise((t,o)=>{const r=e.transaction(["projects"],"readwrite").objectStore("projects").put(P);r.onsuccess=()=>t(P.id),r.onerror=()=>o(r.error)})}async function St(P){const e=await ue;return new Promise((t,o)=>{const r=e.transaction(["projects"],"readonly").objectStore("projects").get(P);r.onsuccess=()=>t(r.result),r.onerror=()=>o(r.error)})}async function Te(){const P=await ue;return new Promise((e,t)=>{const n=P.transaction(["projects"],"readonly").objectStore("projects").getAll();n.onsuccess=()=>e(n.result),n.onerror=()=>t(n.error)})}async function It(P){const e=await ue;return new Promise((t,o)=>{const r=e.transaction(["projects"],"readwrite").objectStore("projects").delete(P);r.onsuccess=()=>t(),r.onerror=()=>o(r.error)})}const U={currentProjectId:null,isSaving:!1,_lastSaveHash:null,_convertedBlobs:new Map,_pendingSave:null,async saveProject(P,e,t=!1){if(this.isSaving)return this._pendingSave||(this._pendingSave=setTimeout(()=>{this._pendingSave=null,this.saveProject(P,e,t)},1e3)),!1;const o=`${(e.pages||[]).length}:${e.cover?.title}:${e.activePageId}:${(e.assets?.photos||[]).length}:${e.cover?.layout}:${e.theme}`;if(this._lastSaveHash===o&&!t){const s=(e.pages||[]).map(i=>`${i.id}:${(i.photos||[]).map(a=>a?.id||"").join(",")}`).join("|"),n=`${e.cover?.frontPhotoId}:${e.cover?.backPhotoId}`,r=`${o}||${s}||${n}`;if(this._lastDeepHash===r)return console.log("[Persistence] Save skipped — no changes detected."),!1;this._lastDeepHash=r}this._lastSaveHash=o,this.isSaving=!0;try{this.currentProjectId||(this.currentProjectId=crypto.randomUUID());const s=r=>{const i=(a,l)=>{if(!(a==="_visionAnalysis"||a==="file"||a==="_analysis"))return l};if(typeof structuredClone=="function")try{return JSON.parse(JSON.stringify(r,i))}catch{}return JSON.parse(JSON.stringify(r,i))},n={id:this.currentProjectId,title:e.cover?.title||"אלבום ללא שם",lastModified:Date.now(),state:s(e)};if(n.state.assets&&n.state.assets.photos){let r=!1;const i=async a=>{if(this._convertedBlobs.has(a))return this._convertedBlobs.get(a);try{const c=await(await fetch(a)).blob(),d=await new Promise((p,u)=>{const g=new FileReader;g.onloadend=()=>p(g.result),g.readAsDataURL(c)});return this._convertedBlobs.set(a,d),d}catch(l){return console.warn("Failed to convert blob to base64:",a,l),null}};for(let a of n.state.assets.photos){if(a.url&&a.url.startsWith("blob:")){const l=await i(a.url);l&&(a.url=l,r=!0)}if(a.thumbnailUrl&&a.thumbnailUrl.startsWith("blob:")){const l=await i(a.thumbnailUrl);l&&(a.thumbnailUrl=l,r=!0)}!a.thumbnailUrl&&a.url&&!a.url.startsWith("blob:")&&(a.thumbnailUrl=a.url)}r&&n.state.pages&&Array.isArray(n.state.pages)&&n.state.pages.forEach(a=>{a.photos&&Array.isArray(a.photos)&&a.photos.forEach((l,c)=>{if(l&&l.id){const d=n.state.assets.photos.find(p=>p.id===l.id);d&&(a.photos[c].url=d.url,a.photos[c].thumbnailUrl=d.thumbnailUrl||d.url)}})})}if(console.log(`[Persistence] Saving to Local IndexedDB (ID: ${this.currentProjectId})...`),await ke(n),this.updateSaveUI("נשמר מקומית"),P&&t){this.updateSaveUI("מסנכרן לענן...");const r=await this.uploadLocalImages(P,n.state);await G.getFunctions().httpsCallable("saveProject")({projectData:{...r,id:this.currentProjectId}}),this.updateSaveUI("כל השינויים נשמרו")}else setTimeout(()=>this.updateSaveUI(""),2e3)}catch(s){console.error("[Persistence] Save Failed:",s),this.updateSaveUI("שמירה נכשלה!")}finally{this.isSaving=!1}return!0},updateSaveUI(P){document.getElementById("btn-new-project");let e=document.getElementById("save-status-indicator");!e&&document.querySelector(".toolbar-group.center")&&(e=document.createElement("span"),e.id="save-status-indicator",e.style.cssText="font-size: 0.8rem; color: #a1a1aa; margin-left: 15px; transition: opacity 0.3s;",document.querySelector(".toolbar-group.center").appendChild(e)),e&&(e.textContent=P,e.style.opacity=P?"1":"0")},async uploadLocalImages(P,e){if(!e||typeof e!="object")return e;const t=G.getStorage();if(!t)return e;const o=async s=>{if(!(!s||!s.url||!s.url.startsWith("data:image"))){console.log("[Persistence] Uploading Base64 image to Cloud Storage...");try{const r=Date.now(),i=Math.random().toString(36).substring(7),d=await(await t.ref().child(`users/${P}/uploads/${r}_${i}.jpg`).putString(s.url,"data_url")).ref.getDownloadURL();s.url=d,console.log("[Persistence] Cloud Upload Success:",d)}catch(r){console.error("[Persistence] Cloud Upload Failed:",r)}}};if(e.assets&&Array.isArray(e.assets.photos)){const s=e.assets.photos,n=3;for(let r=0;r<s.length;r+=n){const i=s.slice(r,r+n);await Promise.all(i.map(a=>o(a)))}}return e},async loadProject(P,e=null){if(e){if(P)try{const r=await G.getFunctions().httpsCallable("loadProject")({projectId:e});if(r.data&&r.data.success)return this.currentProjectId=e,this.currentRole=r.data.metadata?.role||"owner",this.currentShareSettings=r.data.metadata?.shareSettings||null,this.currentOwner=r.data.metadata?.owner||null,this.currentRole!=="viewer"&&await ke({id:e,title:r.data.data.cover?.title,lastModified:Date.now(),state:r.data.data}),r.data.data}catch(s){console.error("Cloud load failed",s)}const o=await St(e);return o&&o.state?(this.currentProjectId=e,o.state):null}let t;try{t=await Te()}catch(o){console.error("[Persistence] Failed to read from IndexedDB (data may be too large):",o),t=null}if(t&&t.length>0){t.sort((s,n)=>n.lastModified-s.lastModified);const o=t[0];return console.log("[Persistence] Auto-loading most recent LOCAL project:",o.id),this.currentProjectId=o.id,this.currentRole=o.role||"owner",o.state}if(P)try{const r=(await G.getFunctions().httpsCallable("listProjects")()).data.projects||[];if(r.length>0){const i=r[0].id;return console.log("[Persistence] Auto-loading most recent CLOUD project:",i),await this.loadProject(P,i)}}catch(o){console.warn("Cloud list fallback failed",o)}return null},async listProjects(){return(await Te()).map(e=>({id:e.id,title:e.title,lastModified:e.lastModified,source:"local"})).sort((e,t)=>t.lastModified-e.lastModified)},async deleteProject(P){if(await It(P),G.auth.currentUser)try{await G.getFunctions().httpsCallable("deleteProject")({projectId:P})}catch(e){console.warn("Cloud delete failed (may not exist remotedly):",e)}return this.currentProjectId===P&&(this.currentProjectId=null,this.currentRole=null,this.currentShareSettings=null),!0},async updateShareSettings(P,e){if(!G.auth.currentUser)throw new Error("Must be logged in to update share settings");try{const s=await G.getFunctions().httpsCallable("updateShareSettings")({projectId:P,settings:e});if(s.data?.success)return this.currentShareSettings=s.data.shareSettings,s.data;throw new Error(s.data?.error||"Failed")}catch(t){throw console.error("Cloud share update failed:",t),t}},async joinProject(P,e){if(!G.auth.currentUser)throw new Error("Must be logged in to join");try{return(await G.getFunctions().httpsCallable("joinProject")({projectId:P,shareToken:e})).data}catch(t){throw console.error("Cloud join failed:",t),t}},debounce(P,e){let t;return function(...s){const n=()=>{clearTimeout(t),P(...s)};clearTimeout(t),t=setTimeout(n,e)}},presenceUnsubscribe:null,presenceInterval:null,startPresence(P,e,t){if(!e||!P)return;this.stopPresence();const s=G.getDB().collection("projects").doc(P).collection("presence"),n=s.doc(e.uid),r=()=>{n.set({uid:e.uid,displayName:e.displayName||"Anonymous",photoURL:e.photoURL||null,lastActive:Date.now()},{merge:!0}).catch(i=>console.error("Presence update failed",i))};r(),this.presenceInterval=setInterval(r,3e4),window.addEventListener("beforeunload",()=>{n.delete().catch(()=>{})}),this.presenceUnsubscribe=s.onSnapshot(i=>{const a=Date.now(),l=[];i.forEach(c=>{const d=c.data();d.lastActive&&a-d.lastActive<9e4&&l.push(d)}),t&&t(l)})},stopPresence(){this.presenceInterval&&clearInterval(this.presenceInterval),this.presenceUnsubscribe&&this.presenceUnsubscribe()}};class Le{constructor(e,t){this.config=e,this.photos=t,this.layouts=e.pageLayouts}assignPhotos(){const e=this.config.photoAssignmentRules?.groupingStrategy||"sequential";if(e==="by_category_similarity")return this.assignPhotosByCategoryNoCover();if(e==="chronological_by_location")return this.assignPhotosByLocationNoCover();const t=[];let o=[...this.photos];const n=(this.config.defaultPageSequence||this.config.pageLayouts.map(i=>({layoutId:i.layoutId}))).filter(i=>!i.layoutId.toLowerCase().includes("cover"));for(const i of n){if(o.length===0)break;const a=this.getLayout(i.layoutId);if(!a)continue;const l=a.photoSlots?a.photoSlots.length:0;if(l===0||o.length>=l){const c=o.splice(0,l);t.push({layout:a,photos:c,textContent:this.generateDefaultText(a)})}}for(;o.length>0;)if(o.length>=2){let i=this.getLayout("side-by-side")||this.getLayout("two-photos-vertical")||this.getLayout("duo-horizontal")||this.findLayoutWithSlotCount(2);if(i){const a=o.splice(0,2);t.push({layout:i,photos:a,textContent:this.generateDefaultText(i)})}else{const a=this.getLayout("story-right")||this.getLayout("hero-with-caption")||this.getLayout("full-bleed-hero")||this.findLayoutWithSlotCount(1);if(a){const l=o.splice(0,1);t.push({layout:a,photos:l,textContent:this.generateDefaultText(a)})}else console.warn("PhotoAssigner: No valid 1 or 2 slot layouts found for remaining photos."),o=[]}}else{const i=this.getLayout("story-right")||this.getLayout("hero-with-caption")||this.getLayout("full-bleed-hero")||this.findLayoutWithSlotCount(1);if(i){const a=o.splice(0,1);t.push({layout:i,photos:a,textContent:this.generateDefaultText(i)})}else console.warn("PhotoAssigner: No valid 1-slot layout found for remaining photo."),o=[]}const r=this.getLayout("thank-you")||this.getLayout("single-hero-centered");return r&&!r.layoutId.toLowerCase().includes("cover")&&t.push({layout:r,photos:[],textContent:this.generateDefaultText(r)}),t}assignPhotosByCategoryNoCover(){const e=[],t=this.categorizePhotos(),o=this.getLayout("about-studio");if(o&&e.push({layout:o,photos:[this.photos[0]],textContent:this.generateDefaultText(o)}),Object.keys(t).length>=3){const n=this.getLayout("table-of-contents");if(n){const r=Object.values(t).map(i=>i[0]).slice(0,6);e.push({layout:n,photos:r,textContent:this.generateTocLabels(t)})}}Object.entries(t).forEach(([n,r])=>{if(r.length>0){let i="category-hero-left";r.length>=5?i="category-hero-grid":r.length===4&&(i="category-collage");const a=this.getLayout(i);if(a){const l=a.photoSlots.length,c=r.slice(0,l);e.push({layout:a,photos:c,textContent:{categoryTitle:n,categorySubtitle:"Collection"}});let d=r.slice(l);this.addGalleryPages(e,d)}}});const s=this.getLayout("thank-you");return s&&e.push({layout:s,photos:[],textContent:this.generateDefaultText(s)}),e}assignPhotosByLocationNoCover(){const e=[],t=this.groupPhotosByLocation(),o=this.getLayout("title-hero");o&&e.push({layout:o,photos:[this.findBestHeroPhoto(this.photos)],textContent:{destination:this.detectDestination()||"Adventure Awaits"}});let s=1;t.forEach((r,i)=>{if(r.length>=2){const a=this.getLayout("location-page");a&&e.push({layout:a,photos:[this.findBestHeroFromGroup(r)],textContent:{locationTitle:i||`Place ${this.numberToWord(s)}`,description:""}});const l=r.slice(1);this.addTravelGalleryPages(e,l),s++}else r.length===1&&this.addTravelGalleryPages(e,r)});const n=this.getLayout("closing-grid");if(n){const r=this.selectFinalPhotos(4);e.push({layout:n,photos:r,textContent:{thanks:"The End"}})}return e}assignPhotosByCategory(){const e=[],t=this.categorizePhotos(),o=this.getLayout("cover-hero"),s=this.findBestHeroPhoto(this.photos)||this.photos[0];o&&e.push({layout:o,photos:[s],textContent:{title:"Photography",subtitle:"Portfolio",handle:"@STUDIO"}});const n=this.getLayout("about-studio");if(n&&e.push({layout:n,photos:[this.photos[1]||s],textContent:this.generateDefaultText(n)}),Object.keys(t).length>=3){const i=this.getLayout("table-of-contents");if(i){const a=Object.values(t).map(l=>l[0]).slice(0,6);e.push({layout:i,photos:a,textContent:this.generateTocLabels(t)})}}Object.entries(t).forEach(([i,a])=>{if(a.length>0){let l="category-hero-left";a.length>=5?l="category-hero-grid":a.length===4&&(l="category-collage");const c=this.getLayout(l);if(c){const d=c.photoSlots.length,p=a.slice(0,d);e.push({layout:c,photos:p,textContent:{categoryTitle:i,categorySubtitle:"Collection"}});let u=a.slice(d);this.addGalleryPages(e,u)}}});const r=this.getLayout("thank-you");return r&&e.push({layout:r,photos:[],textContent:this.generateDefaultText(r)}),e}categorizePhotos(){const e={},t=this.config.photoAssignmentRules?.categoryDetection||{},o=["Portrait","Maternity","Events","Product"];return this.photos.forEach((s,n)=>{let r="General";if(s.metadata&&s.metadata.tags){for(const[i,a]of Object.entries(t))if(s.metadata.tags.some(l=>a.includes(l))){r=i;break}}else r=o[n%o.length];e[r]||(e[r]=[]),e[r].push(s)}),e}addGalleryPages(e,t){for(;t.length>0;){let o,s=0;if(t.length>=6?(o=this.getLayout("gallery-six"),s=6):t.length>=4?(o=this.getLayout("gallery-four-large"),s=4):t.length>=2?(o=this.getLayout("duo-horizontal"),s=2):(o=this.getLayout("full-bleed-single"),s=1),o)e.push({layout:o,photos:t.splice(0,s),textContent:{}});else break}}findBestHeroPhoto(e){return e[0]}generateTocLabels(e){const t={};return Object.keys(e).slice(0,6).forEach((o,s)=>{t[`label${s+1}`]=o}),{title:"Content",titleSans:"List",...t}}getLayout(e){return this.layouts.find(t=>t.layoutId===e)}findLayoutWithSlotCount(e){return this.layouts.find(t=>{const o=t.photoSlots?t.photoSlots.length:0,s=t.layoutId.toLowerCase().includes("cover")||t.pageType==="cover";return o===e&&!s})}findBestHeroIndex(e){return e.findIndex(t=>t.width&&t.height?t.width>t.height:!1)}generateDefaultText(e){const t={};this._layoutUsageCount||(this._layoutUsageCount={});const o=e.layoutId;this._layoutUsageCount[o]=this._layoutUsageCount[o]||0;const s=this._layoutUsageCount[o];return this._layoutUsageCount[o]++,e.textElements&&e.textElements.forEach(n=>{const r=this._getTextVariants(o,n.elementId);r&&r.length>0?t[n.elementId]=r[s%r.length]:t[n.elementId]=n.placeholder,n.children&&n.children.forEach(i=>t[i.elementId]=i.placeholder)}),t}_getTextVariants(e,t){const s={"hero-with-caption":{caption:["הרגע שחיכינו לו","יום של גאווה","רגע של קדושה","חגיגה של שמחה","הדרך לבגרות","רגעים מיוחדים","ברגע הזה הכל השתנה","עליית מדרגה"],subcaption:["בית הכנסת","עם המשפחה","רגע של התרגשות","חוויה בלתי נשכחת","יום שלא נשכח","זיכרונות לכל החיים","תחילת דרך חדשה","הרגע שלנו"]},"story-right-photo":{storyTitle:["ההכנות לקראת היום הגדול","הדרך עד לכאן","מחשבות לפני העלייה","רגעים של גיוס","הסיפור שלנו"],storyText:[`חודשים של הכנה, לימוד הפרשה וההפטרה, בחירת הנושא לדרשה - כל אלה הובילו לרגע המיוחד הזה.

צפינו לראות את הילד שלנו עולה לתורה, וליבנו מלא גאווה.`,`מרגע שהתחלנו לתכנן, ידענו שזה יהיה יום מיוחד.
כל פרט קטן תוכנן בקפידה, כל רגע נבחר בזהירות.`,`הרגע הזה מסמל את המעבר מילדות לבגרות.
תקופה חדשה מתחילה, מלאה באתגרים והזדמנויות.`,`כל הדרך הביאה אותנו לרגע הזה.
רגע של אושר, גאווה והתרגשות.`,`הסיפור המשפחתי שלנו מקבל היום פרק חדש.
פרק של אחריות, גאווה ושמחה.`]},"story-left-photo":{storyTitle:["רגעים של שמחה","ברגע הזה","חגיגה אמיתית","הזיכרונות היפים","יום של אהבה"],storyText:["החגיגה עם כל המשפחה והחברים הקרובים. רגעים של אושר טהור שנזכור לתמיד.","כשכל אלה שאהבנו מתאספים יחד, הלב מתמלא בשמחה עצומה.","הצחוקים, הריקודים, החיבוקים - כל רגע נחרט בזיכרון.","היום הזה הוכיח שוב כמה משפחה זה הדבר הכי חשוב.","רגעים כאלה לא קורים כל יום. שמחנו על כל שניה."]},"grid-four-celebration":{pageTitle:["רגעים מהחגיגה","תמונות מהאירוע","רגעים בלתי נשכחים","מהרגעים היפים","זיכרונות מתוקים"],caption1:["עם סבא וסבתא","רגע משפחתי","חיוכים של אושר","יחד"],caption2:["החברים הכי טובים","חברים לדרך","צמד בלתי מנוצח","רגע של חברות"],caption3:["ריקודים","על הרחבה","שמחה אמיתית","רגע של שמחה"],caption4:["עוגת הבר מצווה","המתוקים","חגיגה של טעמים","רגע מתוק"]},"grid-six":{pageTitle:["עוד רגעים יפים","גלריה","רגעי שיא","עוד מהחגיגה","רגעים נבחרים"]},"full-photo-quote":{quoteText:["האהבה שלנו היא הסיפור הכי יפה","כל רגע איתך הוא מתנה","ביחד אנחנו יכולים הכל","את/ה הבית שלי"]},"split-diagonal":{centerText:["לנצח","יחד","אהבה","רגע קסום"]},"filmstrip-moments":{title:["רגעים מהערב","הקסם של הלילה","רגעים בלתי נשכחים","מהחגיגה שלנו"],subtitle:["כל רגע שווה זהב","זיכרונות של אושר","יום שלא נשכח","חגיגה של אהבה"]}}[e];return s&&s[t]||null}assignPhotosByLocation(){const e=[];let t=0;const o=this.groupPhotosByLocation(),s=this.getLayout("cover-grid");s&&(e.push({layout:s,photos:this.selectDiversePhotos(4),textContent:{destination:this.detectDestination()||"My Journey"}}),t+=4);const n=this.getLayout("title-hero");n&&(e.push({layout:n,photos:[this.findBestHeroPhoto(this.photos.slice(t))],textContent:{destination:this.detectDestination()||"Adventure Awaits"}}),t+=1);let r=1;o.forEach((a,l)=>{if(a.length>=2){const c=this.getLayout("location-page");c&&e.push({layout:c,photos:[this.findBestHeroFromGroup(a)],textContent:{locationTitle:l||`Place ${this.numberToWord(r)}`,description:""}});const d=a.slice(1);this.addTravelGalleryPages(e,d),r++}else a.length===1&&this.addTravelGalleryPages(e,a)});const i=this.getLayout("closing-grid");if(i){const a=this.selectFinalPhotos(4);e.push({layout:i,photos:a,textContent:{thanks:"The End"}})}return e}groupPhotosByLocation(){const e=new Map;return this.photos.forEach(t=>{const o=t.metadata?.location||t.metadata?.geoLocation?.name||this.extractDateGroup(t)||"Unknown Location";e.has(o)||e.set(o,[]),e.get(o).push(t)}),e}extractDateGroup(e){return e.metadata?.dateTaken?new Date(e.metadata.dateTaken).toLocaleDateString():null}addTravelGalleryPages(e,t){for(;t.length>0;){let o=null,s=0;if(t.length>=4?(o=this.getLayout("hero-three-thumbnails")||this.getLayout("gallery-four-large")||this.findLayoutWithSlotCount(4)||this.findLayoutWithSlotCount(5)||this.findLayoutWithSlotCount(6),o&&(s=o.photoSlots.length)):t.length===3?(o=this.getLayout("tall-left-stacked-right")||this.findLayoutWithSlotCount(3),o&&(s=o.photoSlots.length)):t.length===2&&(o=this.getLayout("two-tall-photos")||this.getLayout("duo-horizontal")||this.findLayoutWithSlotCount(2),s=2),o||(o=this.getLayout("single-centered")||this.getLayout("full-bleed-hero")||this.findLayoutWithSlotCount(1),s=1),o){const n=Math.min(t.length,o.photoSlots?o.photoSlots.length:s);e.push({layout:o,photos:t.splice(0,n),textContent:this.generateDefaultText(o)})}else{console.warn("PhotoAssigner: No valid gallery layouts found. Stopping.");break}}}selectTravelGalleryLayout(e){return e>=4?"hero-three-thumbnails":e===3?"tall-left-stacked-right":e===2?"two-tall-photos":"single-centered"}selectDiversePhotos(e){const t=[],o=[...this.photos];for(let s=0;s<e&&o.length>0;s++){const n=Math.floor(s*o.length/e);o[n]?t.push(o.splice(n,1)[0]):t.push(o.shift())}return t}findBestHeroFromGroup(e){return e.find(t=>t.metadata?.orientation==="landscape")||e[0]}selectFinalPhotos(e){return this.photos.slice(-e)}detectDestination(){for(const e of this.photos){if(e.metadata?.location)return e.metadata.location;if(e.metadata?.geoLocation?.country)return e.metadata.geoLocation.country}return null}numberToWord(e){return["One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten"][e-1]||e.toString()}}class Pt{constructor(){this.currentTemplateId=null,this.config=null}async loadTemplate(e){console.log("TemplateManager v2 loaded. ensure family-roots-v1 is supported."),console.log("TemplateManager.loadTemplate called with:",e);let t="";if(e==="romantic-journey-v1"?t="templates/romantic-journey-template.json":e==="photography-portfolio-v1"?t="templates/photography-portfolio-template.json":e==="travel-journey-v1"?t="templates/travel-journey-template.json":e==="family-roots-v1"?t="templates/family-roots-template.json":e==="bar-mitzvah-v1"?t="templates/bar-mitzvah-template.json":e==="wedding-prestige-hebrew-v1"?t="templates/wedding-prestige-template.json":e==="baby-first-year-hebrew-v1"?t="templates/baby-first-year-template.json":e==="adventure-journal-v1"?t="templates/adventure-journal-template.json":e==="bat-mitzvah-v1"?t="templates/bat-mitzvah-v1-template.json":e==="birthday-v1"?t="templates/birthday-v1-template.json":e==="graduation-v1"?t="templates/graduation-v1-template.json":e==="army-enlistment-v1"?t="templates/army-enlistment-v1-template.json":e==="engagement-v1"?t="templates/engagement-v1-template.json":e==="wedding-prestige-preview-v1"?t="templates/wedding-prestige-template.json":e==="bar-mitzvah-preview-v1"?t="templates/bar-mitzvah-template.json":e==="photography-portfolio-preview-v1"?t="templates/photography-portfolio-template.json":e==="romantic-journey-preview-v1"?t="templates/romantic-journey-template.json":e==="travel-journey-preview-v1"?t="templates/travel-journey-template.json":e==="baby-first-year-preview-v1"?t="templates/baby-first-year-template.json":e==="family-roots-preview-v1"&&(t="templates/family-roots-template.json"),t){console.log("Loading template path:",t);try{const o=await fetch(t);return this.config=await o.json(),this.currentTemplateId=e,this.config}catch(o){throw console.error("Failed to load template config:",o),o}}}generateAlbumWithCover(e){if(!this.config)return console.error("Template not loaded"),[];const t=[],o=this.config.pageLayouts.find(a=>a.pageType==="cover"||a.layoutId==="cover"||a.layoutId==="cover-elegant");if(o){const a=e.length>0?[e[0]]:[],l=this.generateCoverTextContent(),c={layout:o,photos:a,textContent:l},d=this.convertToState(c,0);t.push(d)}const s=o?e.slice(1):e,i=new Le(this.config,s).assignPhotos().map((a,l)=>this.convertToState(a,l+1));return t.push(...i),t}generateAlbum(e){return this.config?new Le(this.config,e).assignPhotos().map((s,n)=>this.convertToState(s,n)):(console.error("Template not loaded"),[])}generateCoverTextContent(){return!this.config||!this.config.autoGenerateText?{childName:"Daniel Cohen",hebrewDate:"י״ג באדר תשפ״ה",gregorianDate:"15 במרץ 2025",barMitzvahLabel:"בר מצווה"}:{childName:this.config.autoGenerateText.childName||"דניאל כהן",hebrewDate:this.config.autoGenerateText.hebrewDate||"י״ג באדר תשפ״ה",gregorianDate:this.config.autoGenerateText.gregorianDate||"15 במרץ 2025",barMitzvahLabel:this.config.autoGenerateText.barMitzvahLabel||"בר מצווה"}}generateCover(e={}){if(!this.config)return null;const t=this.config.pageLayouts.find(n=>n.layoutId==="cover"||n.pageType==="cover");if(!t)return null;const o=this.getDefaultCoverTitle(),s=this.getDefaultCoverSubtitle();return{layout:"custom",title:o,subtitle:s,spineText:o,frontPhotoId:e.front?.id||null,backPhotoId:e.back?.id||null,theme:this.config.designSystem.colors.background,textColor:this.config.designSystem.colors.text.primary,templateId:this.currentTemplateId,customLayout:t}}getDefaultCoverTitle(){if(!this.config)return"My Photo Book";if(this.config.autoGenerateText?.title)return this.config.autoGenerateText.title;const e=this.config.autoGenerateText?.defaultTitles?.cover;if(e)return Array.isArray(e)?e[0]:e;switch(this.currentTemplateId){case"romantic-journey-v1":return"Our Love Story";case"photography-portfolio-v1":return"Photography Portfolio";case"travel-journey-v1":return"Travel Journey";case"family-roots-v1":return"Family Roots";case"bar-mitzvah-v1":return"בר מצווה";case"baby-first-year-hebrew-v1":return"השנה הראשונה";case"adventure-journal-v1":return"יומן הרפתקאות";default:return"My Photo Book"}}getDefaultCoverSubtitle(){if(!this.config)return new Date().getFullYear().toString();if(this.config.autoGenerateText?.subtitle)return this.config.autoGenerateText.subtitle;const e=new Date().getFullYear().toString();switch(this.currentTemplateId){case"romantic-journey-v1":return e;case"photography-portfolio-v1":return"";case"travel-journey-v1":return e;case"family-roots-v1":return e;case"bar-mitzvah-v1":return e;case"baby-first-year-hebrew-v1":return"Baby's First Year";case"adventure-journal-v1":return"Adventure Journal";default:return e}}regeneratePage(e,t){if(!this.config)return null;const o=this.config.pageLayouts.find(r=>r.layoutId===t);if(!o)return console.error("Layout not found:",t),null;const s={layout:o,photos:e.photos||[],textContent:{}},n=this.convertToState(s,0);return n.id=e.id,n}getAlternativeLayoutId(e,t){if(!this.config)return null;const o=this.config.pageLayouts.filter(n=>n.photoSlots.length===t&&n.layoutId!==e&&n.pageType!=="cover");return o.length===0?null:o[Math.floor(Math.random()*o.length)].layoutId}getLayoutIdForCount(e){if(!this.config)return null;const t=this.config.pageLayouts.filter(o=>o.photoSlots.length===e&&o.pageType!=="cover");return t.length>0?t[0].layoutId:null}convertToState(e,t){const{layout:o,photos:s,textContent:n}=e,r={id:`page_${crypto.randomUUID()}`,layout:{id:o.layoutId,name:o.layoutName,slots:[]},photos:s,elements:[],background:this.config.designSystem.colors.background,templateId:this.config.templateId,rawLayoutId:o.layoutId,textContent:n};return o.photoSlots&&o.photoSlots.forEach((i,a)=>{const l=s[a];l&&r.layout.slots.push({id:`slot_${crypto.randomUUID()}`,photoId:l.id,x:parseFloat(i.position.x),y:parseFloat(i.position.y),width:parseFloat(i.size.width),height:parseFloat(i.size.height),rotation:i.rotation||0,styleId:i.style||"default"})}),o.textElements&&o.textElements.forEach(i=>{const a=n[i.elementId]||i.placeholder;if(i.children){const l={id:`container_${crypto.randomUUID()}`,type:"container",x:parseFloat(i.position.x)-parseFloat(i.size.width)/2,y:parseFloat(i.position.y)-parseFloat(i.size.height)/2,width:parseFloat(i.size.width),height:parseFloat(i.size.height),backgroundColor:this.resolveColor(i.background),elements:[]};i.children.forEach(c=>{const d=n[c.elementId]||c.placeholder;l.elements.push({id:`text_${crypto.randomUUID()}`,type:"text",content:d,fontSize:parseInt(c.style.size)||14,fontFamily:this.resolveFont(c.style.font),color:this.resolveColor(c.style.color),textAlign:c.style.align||"center"})}),r.elements.push(l)}else{const l=i.alignment?.horizontal==="center"?"center":i.style.align||i.alignment?.horizontal||void 0,c=i.alignment?.horizontal==="center"||i.position.x==="50%";r.elements.push({id:`text_${crypto.randomUUID()}`,type:"text",content:a,x:parseFloat(i.position.x),y:parseFloat(i.position.y),width:i.size?parseFloat(i.size.width):void 0,fontSize:parseInt(i.style.size)||24,fontFamily:this.resolveFont(i.style.font),color:this.resolveColor(i.style.color),align:l,textAlign:l,centered:c,direction:i.alignment?.direction||(this.config.direction==="rtl"?"rtl":void 0),fontWeight:i.style.weight,letterSpacing:i.style.letterSpacing,lineHeight:i.style.lineHeight})}}),o.decorations&&o.decorations.forEach(i=>{let a,l,c;if(i.element&&this.config.decorativeElements&&this.config.decorativeElements[i.element]){const d=this.config.decorativeElements[i.element];a=d.width,l=d.height,c=d.color,d.sizes&&i.size&&d.sizes[i.size]&&(a=d.sizes[i.size].width,l=d.sizes[i.size].height)}else(i.type==="overlay"||i.style)&&(a=i.size?i.size.width:"0",l=i.size?i.size.height:"0",c=i.style?i.style.backgroundColor:"rgba(0,0,0,0.1)");a&&l&&r.elements.push({id:`dec_${crypto.randomUUID()}`,type:"shape",subtype:i.type||"rect",x:parseFloat(i.position.x),y:parseFloat(i.position.y),width:parseFloat(a),height:parseFloat(l),color:this.resolveColor(c),zIndex:0})}),r}resolveFont(e){if(!e)return"sans-serif";const t=this.config.designSystem.typography,o=t[e]||t.sans;return o.family?`'${o.family}', ${o.fallback}`:"sans-serif"}resolveColor(e){if(!e)return"#000000";const t=this.config.designSystem.colors;return e==="primary"?t.text.primary:e==="secondary"?t.text.secondary:e==="accent"?t.accent:e==="background"?t.background:e}}class ve{constructor(e,t){this.container=document.getElementById(e),this.app=t,this.manager=new Pt}init(){this.container&&this.render()}render(){this.container.innerHTML="";const e=window.ALBUM_TEMPLATES||{};if(Object.keys(e).length===0){this.container.innerHTML='<div style="padding:20px; color:#ccc;">לא נמצאו תבניות</div>';return}Object.values(e).forEach(t=>{const o=this.createTemplateCard(t);this.container.appendChild(o)})}createTemplateCard(e){const t=document.createElement("div");return t.className="template-card",t.style.cursor="pointer",t.onclick=()=>this.handleTemplateSelect(e.id),t.innerHTML=`
            <div class="template-preview" style="background-color: transparent; height: 120px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${e.thumbnail?`<img src="${e.thumbnail}" style="width:100%; height:100%; object-fit:contain;">`:'<span style="font-size: 2rem;">✨</span>'}
            </div>
            <div class="template-info" style="padding: 10px;">
                <h4 style="margin: 0 0 5px 0;">${e.name}</h4>
                <p style="margin: 0; font-size: 0.8rem; color: #666;">${e.description}</p>
                <div style="margin-top: 5px; font-size: 0.75rem; color: #888;">${e.minPhotos}+ תמונות</div>
            </div>
        `,t}async handleTemplateSelect(e){console.log(`Selected template: ${e}`);const t=this.app.state?.assets?.photos||[];if(t.length===0){alert("אנא הוסף קודם תמונות ללשונית ה'תמונות'!");return}let o=document.querySelector(".mc4-progress");o||(o=document.createElement("div"),o.className="mc4-progress",document.body.appendChild(o)),o.innerHTML=`
            <div class="mc4-magic-scene">
                <div class="mc4-book">
                    <div class="mc4-page mc4-page-1"></div><div class="mc4-page mc4-page-2"></div><div class="mc4-page mc4-page-3"></div>
                </div>
                <div class="mc4-wand"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                <div class="mc4-sparkles"><span>✨</span><span>✨</span><span>✨</span></div>
            </div>
            <div class="mc4-status">
                <h3>מחיל תבנית</h3>
                <p id="mc4-dynamic-msg">🔍 סורק תמונות...</p>
            </div>
        `,o.style.display="flex";try{await this.manager.loadTemplate(e),window._magicPages=null,window._magicCover=null;const s={front:t[0],back:t[1]||t[0]},n=this.manager.generateCover(s),r=t.slice(1),i=this.manager.generateAlbum(r);this.app.renderAlbumPages({pages:i,cover:n}),console.log(`[TemplateSidebar] Applied template ${e}`),setTimeout(()=>{const a=document.getElementById("mc4-dynamic-msg");a&&(a.innerText="⚖️ מייעל חיתוכים ונקודות מיקוד...")},1e3),setTimeout(()=>{const a=document.getElementById("mc4-dynamic-msg");a&&(a.innerText="📚 מרכיב את האלבום...")},2e3),setTimeout(()=>{o&&(o.classList.add("mc4-fade-out"),setTimeout(()=>o.remove(),500))},3e3)}catch(s){console.error("Failed to apply template",s),o&&o.remove(),alert("שגיאה בטעינת התבנית: "+s.message)}}}class ee{static LAYOUTS=[{id:"standard",label:"רגיל",description:"תמונה למעלה, טקסט למטה"},{id:"full-bleed",label:"תמונה מלאה",description:"התמונה ממלאת את כל הכריכה"},{id:"photo-bottom",label:"תמונה למטה",description:"טקסט למעלה, תמונה למטה"},{id:"centered",label:"ממורכז",description:"תמונה ממורכזת עם שכבת טקסט מעל"},{id:"minimal",label:"מינימליסטי",description:"טקסט בלבד, ללא תמונה"},{id:"split",label:"מפוצל",description:"תמונה משמאל, טקסט מימין"},{id:"elegant",label:"אלגנטי",description:"עיטורי גבול על תוכן ממורכז"}];static FONTS=[{id:"playfair",family:"'Playfair Display', serif",label:"Playfair Display"},{id:"montserrat",family:"'Montserrat', sans-serif",label:"Montserrat"},{id:"roboto",family:"'Roboto', sans-serif",label:"Roboto"},{id:"lato",family:"'Lato', sans-serif",label:"Lato"},{id:"opensans",family:"'Open Sans', sans-serif",label:"Open Sans"},{id:"cormorant",family:"'Cormorant Garamond', serif",label:"Cormorant Garamond"},{id:"dancing",family:"'Dancing Script', cursive",label:"Dancing Script"},{id:"great-vibes",family:"'Great Vibes', cursive",label:"Great Vibes"},{id:"cinzel",family:"'Cinzel', serif",label:"Cinzel"},{id:"raleway",family:"'Raleway', sans-serif",label:"Raleway"},{id:"heebo",family:"'Heebo', sans-serif",label:"Heebo (היבו)"},{id:"frankruhl",family:"'Frank Ruhl Libre', serif",label:"Frank Ruhl Libre (פרנק ריהל)"},{id:"rubik",family:"'Rubik', sans-serif",label:"Rubik (רוביק)"},{id:"varela",family:"'Varela Round', sans-serif",label:"Varela Round (ורלה)"},{id:"aleo",family:"'Aleo', serif",label:"Aleo (אלאו)"},{id:"caveat",family:"'Caveat', cursive",label:"Caveat (כתב יד)"},{id:"gveret-levin",family:"'Gveret Levin', cursive",label:"Gveret Levin (גברת לוין)"},{id:"playpen-hebrew",family:"'Playpen Sans Hebrew', cursive",label:"Playpen Sans Hebrew (פלייפן)"},{id:"amatic-sc",family:"'Amatic SC', cursive",label:"Amatic SC (אמטיק)"},{id:"fredoka",family:"'Fredoka', sans-serif",label:"Fredoka (פרדוקה)"}];static TEMPLATE_DEFAULTS={"romantic-journey-v1":{title:"Our Love Story",subtitle:"2024",spineText:"Our Love Story",layout:"elegant",titleFont:"'Playfair Display', serif",bodyFont:"'Montserrat', sans-serif",bgColor:"#1a1a2e",textColor:"#C9A227"},"travel-journey-v1":{title:"Travel Adventures",subtitle:"Memories & Journeys",spineText:"Travel Memories",layout:"full-bleed",titleFont:"'Montserrat', sans-serif",bodyFont:"'Open Sans', sans-serif",bgColor:"#2d3436",textColor:"#ffffff"},"bar-mitzvah-v1":{title:"בר מצווה",subtitle:"מזל טוב",spineText:"Bar Mitzvah",layout:"elegant",titleFont:"'Cinzel', serif",bodyFont:"'Montserrat', sans-serif",bgColor:"#1a1a2e",textColor:"#C9A227"},"wedding-prestige-hebrew-v1":{title:"החתונה שלנו",subtitle:"נצח",spineText:"חתונה",layout:"custom",titleFont:"'Frank Ruhl Libre', serif",bodyFont:"'Heebo', sans-serif",bgColor:"#0D0D0D",textColor:"#C9A962"},"family-roots-v1":{title:"Our Family",subtitle:"Generations of Love",spineText:"Family Album",layout:"standard",titleFont:"'Cormorant Garamond', serif",bodyFont:"'Lato', sans-serif",bgColor:"#f5f0eb",textColor:"#4a3728"},"photography-portfolio-v1":{title:"Portfolio",subtitle:"Selected Works",spineText:"Portfolio",layout:"minimal",titleFont:"'Raleway', sans-serif",bodyFont:"'Open Sans', sans-serif",bgColor:"#ffffff",textColor:"#1a1a1a"},default:{title:"My Photo Book",subtitle:new Date().getFullYear().toString(),spineText:"Photo Book",layout:"standard",titleFont:"'Playfair Display', serif",bodyFont:"'Montserrat', sans-serif",bgColor:"#ffffff",textColor:"#000000"},cover:{title:"My Photo Book",subtitle:new Date().getFullYear().toString(),spineText:"My Photo Book",layout:"standard",titleFont:"'Playfair Display', serif",bodyFont:"'Montserrat', sans-serif",bgColor:"#f5f0eb",textColor:"#333333"},"magic-page-v4":{title:"My Photo Book",subtitle:new Date().getFullYear().toString(),spineText:"My Photo Book",layout:"standard",titleFont:"'Playfair Display', serif",bodyFont:"'Montserrat', sans-serif",bgColor:"#f5f0eb",textColor:"#333333"}};static getTemplateDefaults(e){return this.TEMPLATE_DEFAULTS[e]||this.TEMPLATE_DEFAULTS.default}static render(e){const{cover:t,assets:o,templateConfig:s,container:n,interactive:r=!1,thumbnail:i=!1}=e;if(console.log("[UnifiedCoverRenderer] render() ENTRY - cover received:",JSON.stringify({background:t?.background,theme:t?.theme,title:t?.title,templateId:t?.templateId,id:t?.id,keys:t?Object.keys(t):"null"})),!t){const $=document.createElement("div");return $.style.cssText="display:flex;align-items:center;justify-content:center;height:100%;color:#666;",$.textContent="No Cover",n&&(n.innerHTML="",n.appendChild($)),$}const a=t.templateId||s?.templateId,l=this.getTemplateDefaults(a),c=s?.designSystem||{},d=c.colors||{},p=c.typography||{},u=t._userCustomColor?t.color:d.background||t.color||l.bgColor,g=t._userCustomTextColor?t.textColor:d.text?.primary||t.textColor||l.textColor,m=d.decorative?.gold||d.accent||"#C9A227",y=t._userCustomTitleFont?t.titleFont:p.title?.family||p.heading?.family||l.titleFont,w=t._userCustomBodyFont?t.bodyFont:p.body?.family||l.bodyFont;if(t.backgroundElementId&&window.COVER_ELEMENT_LIBRARY){const $=(window.COVER_ELEMENT_LIBRARY.backgrounds||[]).find(B=>B.id===t.backgroundElementId);$&&($.type==="city_skyline"&&$.backSvg&&!t._backSvgDataUri?t._resolvedBackSvg="data:image/svg+xml;charset=utf-8,"+encodeURIComponent($.backSvg):$.type==="gradient"?t._resolvedGradientCss=$.gradientCss:$.type==="solid_color"&&(t._resolvedSolidColor=$.solidColor))}let b=null;const v=window._magicCover||{},S=typeof t.background=="string"?t.background:t.background?.textureId||t.theme||v.background||v.theme||null;if(S){if(S.startsWith("data:")||S.startsWith("http")||S.startsWith("assets"))b=S,console.log("[UnifiedCoverRenderer] Direct URL background detected. Length:",S.length);else if(window.BACKGROUND_TEXTURES){const $=window.BACKGROUND_TEXTURES.find(B=>B.id===S);$&&$.url?(b=$.url,console.log("[UnifiedCoverRenderer] Resolved texture:",S,"→ URL length:",$.url.length)):console.warn("[UnifiedCoverRenderer] Texture NOT FOUND for ID:",S,"Available:",window.BACKGROUND_TEXTURES.length)}}else console.log("[UnifiedCoverRenderer] No background ID to resolve. cover.background:",t.background,"cover.theme:",t.theme,"magicFallback:",v.background);const f=t.title||l.title,x=t.subtitle||l.subtitle,C=t.spineText||t.title||l.spineText,I=t.layout||l.layout;if(i)return this.renderThumbnail({...t,title:f,subtitle:x,spineText:C},o,{bgColor:u,textColor:g,titleFont:y});const E=document.createElement("div");E.className="unified-cover-wrapper album-page";const T=s?.designSystem?.canvas?.width||800,k=s?.designSystem?.canvas?.height||600;E.style.cssText=`
            display: flex;
            width: ${T}px;
            height: ${k}px;
            padding: 0; /* Remove padding from wrapper, let internal sections handle it */
            gap: 0; /* Remove gap, spine handles spacing */
            justify-content: center;
            align-items: center;
            background-color: transparent; /* Background handled by sections */
            box-sizing: border-box;
            margin: auto; /* Center in container */
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); /* Match .album-page shadow */
        `;const L=this.createBackCover(t,o,{bgColor:u,textColor:g,interactive:r,bgTextureUrl:b});E.appendChild(L);const _=this.createSpine({...t,spineText:C},{bgColor:u,textColor:g,titleFont:y,bgTextureUrl:b});E.appendChild(_);const R=this.createFrontCover({...t,title:f,subtitle:x,layout:I},o,{bgColor:u,textColor:g,titleFont:y,bodyFont:w,accentColor:m,interactive:r,layout:I,bgTextureUrl:b});return E.appendChild(R),n&&(n.innerHTML="",n.appendChild(E)),E}static createBackCover(e,t,{bgColor:o,textColor:s,interactive:n,bgTextureUrl:r}){const i=document.createElement("div");i.className="cover-section back-cover",i.style.cssText=`
            flex: 1;
            height: 100%;
            position: relative;
            background-color: ${o};
            box-shadow: 3px 3px 10px rgba(0,0,0,0.4);
            border-radius: 2px 0 0 2px;
            overflow: hidden;
        `;const a=e._backSvgDataUri||r;if(a&&(i.style.backgroundImage=`url("${a}")`,i.style.backgroundSize="cover",i.style.backgroundPosition="center"),e.backPhotoId&&t?.photos){const l=t.photos.find(c=>c.id===e.backPhotoId);if(l){const c=document.createElement("img");c.src=l.thumbnailUrl||l.url;const d=e.backCrop||{},p=d.panX!==void 0?d.panX:50,u=d.panY!==void 0?d.panY:50;c.style.cssText=`width:100%;height:100%;object-fit:cover;object-position:${p}% ${u}%;`,c.onerror=()=>{c.src="assets/placeholder-image.png"},i.appendChild(c)}}else if(n){const l=document.createElement("div");l.style.cssText=`
                width: 100%; height: 100%;
                display: flex; align-items: center; justify-content: center;
                border: 2px dashed rgba(128,128,128,0.3);
                color: rgba(128,128,128,0.5);
                font-size: 13px;
                direction: rtl;
            `,l.textContent="גרור תמונה לכריכה האחורית",i.appendChild(l)}return n&&(i.dataset.selectableId="cover-back-photo",i.dataset.selectableType="cover-photo"),i}static createSpine(e,{bgColor:t,textColor:o,titleFont:s,bgTextureUrl:n}){const r=document.createElement("div");r.className="cover-section spine",r.style.cssText=`
            width: 30px;
            height: 100%;
            background-color: ${t};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 2px 0 5px rgba(0,0,0,0.2);
            position: relative;
            overflow: hidden;
        `;const i=e._backSvgDataUri||n;i&&(r.style.backgroundImage=`url("${i}")`,r.style.backgroundSize="cover",r.style.backgroundPosition="center");const a=document.createElement("div"),l=e.spineText||e.title||"";return a.textContent=l,a.style.cssText=`
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            font-family: ${s};
            font-size: 11px;
            color: ${o};
            white-space: nowrap;
            letter-spacing: 0.5px;
            text-align: center;
            max-height: 90%;
            overflow: hidden;
            text-overflow: ellipsis;
        `,/[\u0590-\u05FF]/.test(l)&&(a.style.fontFamily="'Fredoka', 'Heebo', sans-serif",a.style.direction="rtl"),r.appendChild(a),r}static createFrontCover(e,t,o){const{bgColor:s,textColor:n,titleFont:r,bodyFont:i,accentColor:a,interactive:l,layout:c,bgTextureUrl:d}=o,p=document.createElement("div");switch(p.className="cover-section front-cover",p.style.cssText=`
            flex: 1;
            height: 100%;
            position: relative;
            background-color: ${s};
            box-shadow: -3px 3px 10px rgba(0,0,0,0.4);
            border-radius: 0 2px 2px 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `,d&&(p.style.backgroundImage=`url("${d}")`,p.style.backgroundSize=e._coverGalleryId?"contain":"cover",p.style.backgroundPosition="center",p.style.backgroundRepeat="no-repeat"),e._resolvedGradientCss&&!d&&(p.style.background=e._resolvedGradientCss),e._resolvedSolidColor&&!d&&!e._resolvedGradientCss&&(p.style.backgroundColor=e._resolvedSolidColor),e._personalityCoverStyle||c){case"full-bleed":case"magazine":case"documentary":case"bold_graphic":case"contact_sheet":case"playful":this.applyFullBleedLayout(p,e,t,o);break;case"editorial":this.applyEditorialLayout(p,e,t,o);break;case"luxe":this.applyLuxeLayout(p,e,t,o);break;case"polaroid":this.applyPolaroidCoverLayout(p,e,t,o);break;case"photo-bottom":this.applyPhotoBottomLayout(p,e,t,o);break;case"centered":this.applyCenteredLayout(p,e,t,o);break;case"minimal":this.applyMinimalLayout(p,e,o);break;case"split":this.applySplitLayout(p,e,t,o);break;case"elegant":this.applyElegantLayout(p,e,t,o);break;case"custom":e.customLayout?this.applyCustomLayout(p,e,t,o):this.applyStandardLayout(p,e,t,o);break;default:this.applyStandardLayout(p,e,t,o);break}if(e.coverDecorations&&e.coverDecorations.length>0&&window.COVER_ELEMENT_LIBRARY){const g={"top-left":"top:8%;left:5%;","top-right":"top:8%;right:5%;","bottom-left":"bottom:28%;left:5%;","bottom-right":"bottom:28%;right:5%;","bottom-center":"bottom:28%;left:50%;transform:translateX(-50%);"};e.coverDecorations.forEach(m=>{const y=typeof m=="string"?m:m.id,w=(window.COVER_ELEMENT_LIBRARY.decorations||[]).find(f=>f.id===y);if(!w||!w.svg)return;const b=w.defaultSize||{w:40,h:40},v=document.createElement("div");v.className="cover-decoration-overlay",v.dataset.decoId=y,v.style.cssText=`position:absolute;width:${b.w}px;height:${b.h}px;pointer-events:none;z-index:5;opacity:0.9;${g[w.placement||"bottom-left"]||g["bottom-left"]}`,v.innerHTML=w.svg;const S=v.querySelector("svg");S&&(S.style.width="100%",S.style.height="100%"),p.appendChild(v)})}return p}static applyStandardLayout(e,t,o,s){const{interactive:n}=s,r=this.createPhotoArea(t,o,{layout:"standard",interactive:n});r.style.cssText+="flex:1;margin:10%;";const i=this.createTextArea(t,s);i.style.cssText+="padding:5% 10% 15%;",e.appendChild(r),e.appendChild(i)}static applyFullBleedLayout(e,t,o,s){const{interactive:n}=s,r=this.createPhotoArea(t,o,{layout:"full-bleed",interactive:n});r.style.cssText+="position:absolute;inset:0;";const i=document.createElement("div");i.style.cssText=["position:absolute","inset:0","z-index:5","background:linear-gradient(to bottom,","  rgba(0,0,0,0) 30%,","  rgba(0,0,0,0.18) 55%,","  rgba(0,0,0,0.72) 85%,","  rgba(0,0,0,0.85) 100%)","pointer-events:none"].join(";");const a=this.createTextArea(t,{...s,textColor:"#ffffff"});a.style.cssText+=["position:absolute","bottom:8%","left:0","right:0","z-index:10","padding:0 7%","box-sizing:border-box","text-shadow:0 1px 6px rgba(0,0,0,0.6)"].join(";"),a.querySelectorAll("*").forEach(d=>{d.style.color="#ffffff"});const l=a.querySelector('.cover-title, [class*="title"]');l&&(l.style.fontSize="clamp(22px, 5cqw, 42px)",l.style.fontWeight="700",l.style.letterSpacing="0.02em");const c=a.querySelector('.cover-subtitle, [class*="subtitle"]');c&&(c.style.opacity="0.85",c.style.fontSize="clamp(11px, 2.5cqw, 18px)",c.style.marginTop="4px"),e.appendChild(r),e.appendChild(i),e.appendChild(a)}static applyEditorialLayout(e,t,o,s){const{interactive:n}=s;!e.style.backgroundImage&&!e.style.background.includes("url")&&(e.style.backgroundColor="#faf6ee");const r=this.createPhotoArea(t,o,{layout:"standard",interactive:n});r.style.cssText+="position:absolute;top:8%;left:10%;right:10%;height:60%;",r.style.boxShadow="0 8px 40px rgba(0,0,0,0.12)";const i=this.createTextArea(t,{...s,textColor:"#1a1a1a"});i.style.cssText+="position:absolute;bottom:5%;left:0;right:0;padding:0 10%;text-align:center;",i.querySelectorAll("*").forEach(d=>{d.style.color="#1a1a1a"});const a=i.querySelector('.cover-title, [class*="title"]');a&&(a.style.fontSize="clamp(18px, 4cqw, 32px)",a.style.fontWeight="300",a.style.letterSpacing="0.1em",a.style.textTransform="none");const l=i.querySelector('.cover-subtitle, [class*="subtitle"]');l&&(l.style.fontSize="clamp(10px, 2cqw, 14px)",l.style.opacity="0.5",l.style.marginTop="8px",l.style.letterSpacing="0.2em",l.style.textTransform="uppercase");const c=document.createElement("div");c.style.cssText="width:40px;height:1px;background:#1a1a1a;opacity:0.3;margin:0 auto 12px;",e.appendChild(r),e.appendChild(c),e.appendChild(i)}static applyLuxeLayout(e,t,o,s){const{interactive:n}=s;!e.style.backgroundImage&&!e.style.background.includes("url")&&(e.style.backgroundColor="#0f172a"),e.style.outline="none";const r=document.createElement("div");r.style.cssText="position:absolute;inset:6%;border:1px solid rgba(201,168,76,0.45);pointer-events:none;z-index:20;",e.appendChild(r);const i=this.createPhotoArea(t,o,{layout:"standard",interactive:n});i.style.cssText+="position:absolute;top:12%;left:14%;right:14%;height:54%;",i.style.boxShadow="0 0 0 1px rgba(201,168,76,0.5), 0 12px 50px rgba(0,0,0,0.7)";const a=document.createElement("div");a.style.cssText="position:absolute;bottom:30%;left:30%;right:30%;height:1px;background:linear-gradient(to right,transparent,#c9a84c,transparent);z-index:5;";const l=this.createTextArea(t,{...s,textColor:"#c9a84c"});l.style.cssText+="position:absolute;bottom:8%;left:0;right:0;padding:0 12%;text-align:center;z-index:10;",l.querySelectorAll("*").forEach(p=>{p.style.color="#c9a84c",p.style.textShadow="0 1px 8px rgba(201,168,76,0.3)"});const c=l.querySelector('.cover-title, [class*="title"]');c&&(c.style.fontSize="clamp(16px, 3.5cqw, 28px)",c.style.fontWeight="300",c.style.letterSpacing="0.15em");const d=l.querySelector('.cover-subtitle, [class*="subtitle"]');d&&(d.style.fontSize="clamp(9px, 1.8cqw, 12px)",d.style.opacity="0.65",d.style.letterSpacing="0.25em",d.style.textTransform="uppercase"),e.appendChild(i),e.appendChild(a),e.appendChild(l)}static applyPolaroidCoverLayout(e,t,o,s){const{interactive:n}=s,r=this.createPhotoArea(t,o,{layout:"standard",interactive:n});r.style.cssText+="position:absolute;top:10%;left:15%;right:15%;height:58%;",r.style.transform="rotate(-1.5deg)",r.style.boxShadow="0 6px 30px rgba(0,0,0,0.25), 0 0 0 12px #fff, 0 0 0 13px rgba(0,0,0,0.08)",r.style.background="#fff",r.style.padding="4%",r.style.boxSizing="border-box";const i=this.createTextArea(t,{...s,textColor:"#2d1a0e"});i.style.cssText+="position:absolute;bottom:8%;left:0;right:0;padding:0 12%;text-align:center;",i.querySelectorAll("*").forEach(l=>{l.style.color="#2d1a0e"});const a=i.querySelector('.cover-title, [class*="title"]');a&&(a.style.fontSize="clamp(16px, 3.5cqw, 26px)",a.style.fontFamily="'Playpen Sans Hebrew', 'Amatic SC', cursive",a.style.fontWeight="600"),e.appendChild(r),e.appendChild(i)}static applyPhotoBottomLayout(e,t,o,s){const{interactive:n}=s,r=this.createTextArea(t,s);r.style.cssText+="padding:15% 10% 5%;";const i=this.createPhotoArea(t,o,{layout:"photo-bottom",interactive:n});i.style.cssText+="flex:1;margin:0 10% 10%;",e.appendChild(r),e.appendChild(i)}static applyCenteredLayout(e,t,o,s){const{interactive:n,bgColor:r}=s;e.style.justifyContent="center",e.style.alignItems="center";const i=this.createPhotoArea(t,o,{layout:"centered",interactive:n});i.style.cssText+="width:70%;height:60%;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);";const a=this.createTextArea(t,s);a.style.cssText+="margin-top:5%;",e.appendChild(i),e.appendChild(a)}static applyMinimalLayout(e,t,o){const{titleFont:s,bodyFont:n,textColor:r}=o;e.style.justifyContent="center",e.style.alignItems="center",e.style.padding="15%";const i=this.createTextArea(t,o);i.style.cssText+="text-align:center;";const a=document.createElement("div");a.style.cssText=`
            width: 60px;
            height: 2px;
            background-color: ${r};
            margin: 20px auto;
            opacity: 0.5;
        `;const l=document.createElement("div");l.style.cssText="display:flex;flex-direction:column;align-items:center;",l.appendChild(i),l.appendChild(a),e.appendChild(l)}static applySplitLayout(e,t,o,s){const{interactive:n}=s;e.style.flexDirection="row";const r=/[\u0590-\u05FF]/,a=r.test(t.title||"")||r.test(t.subtitle||"")?"right":"left",l=this.createPhotoArea(t,o,{layout:"split",interactive:n});l.style.cssText+="flex:1;height:100%;";const c=document.createElement("div");c.style.cssText="flex:1;display:flex;flex-direction:column;justify-content:center;padding:10%;";const d=this.createTextArea(t,{...s,textAlign:a});d.style.textAlign=a,c.appendChild(d),e.appendChild(l),e.appendChild(c)}static applyElegantLayout(e,t,o,s){const{interactive:n,accentColor:r,textColor:i}=s,a=document.createElement("div");a.style.cssText=`
            position: absolute;
            inset: 5%;
            border: 2px solid ${r};
            pointer-events: none;
        `,e.appendChild(a);const l=document.createElement("div");l.style.cssText=`
            position: absolute;
            inset: 7%;
            border: 1px solid ${r};
            opacity: 0.5;
            pointer-events: none;
        `,e.appendChild(l);const c=document.createElement("div");c.style.cssText=`
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 10%;
            box-sizing: border-box;
        `;const d=this.createPhotoArea(t,o,{layout:"elegant",interactive:n});d.style.cssText+="width:60%;max-height:40%;flex-shrink:0;margin-bottom:5%;";const p=this.createTextArea(t,s),u=document.createElement("div");u.style.cssText=`
            width: 80px;
            height: 2px;
            background: linear-gradient(90deg, transparent, ${r}, transparent);
            margin: 15px 0;
        `,c.appendChild(d),c.appendChild(u),c.appendChild(p),e.appendChild(c)}static applyCustomLayout(e,t,o,s){const n=t.customLayout,{interactive:r,assets:i}=s;n.backgroundType==="dark"&&(e.style.backgroundColor="#0D0D0D"),n.photoSlots&&n.photoSlots.forEach(a=>{const l=document.createElement("div");l.className="cover-photo-slot",l.style.cssText=`
                    position: absolute;
                    left: ${a.position.x};
                    top: ${a.position.y};
                    width: ${a.size.width};
                    height: ${a.size.height};
                    overflow: hidden;
                    z-index: 1;
                `,a.photoStyle;let c=null;if(!t._coverGalleryId&&t.frontPhotoId&&o?.photos){const d=o.photos.find(p=>p.id===t.frontPhotoId);d&&(c=d.thumbnailUrl||d.url)}if(c){const d=document.createElement("img");d.src=c,d.style.cssText=`
                        width: 100%;
                        height: 100%;
                        object-fit: ${a.photoFit||"cover"};
                    `,l.appendChild(d)}else l.style.backgroundColor="rgba(255,255,255,0.05)";if(a.overlay){const d=document.createElement("div");d.style.cssText=`
                        position: absolute;
                        inset: 0;
                        background: ${a.overlay};
                        z-index: 2;
                        pointer-events: none;
                    `,l.appendChild(d)}e.appendChild(l)}),n.textElements&&n.textElements.forEach(a=>{const l=document.createElement("div");l.className="cover-text-element";let c=a.content||a.placeholder||"";if(t.textContent&&t.textContent[a.elementId]!==void 0)c=t.textContent[a.elementId];else if(a.elementId==="groomName"||a.elementId==="brideName")if(t.title&&t.title.includes("&")){const f=t.title.split("&").map(x=>x.trim());a.elementId==="groomName"&&f.length>0&&(c=f[0]),a.elementId==="brideName"&&f.length>1&&(c=f[1])}else a.elementId==="groomName"&&(c="אריאל"),a.elementId==="brideName"&&(c="מיכל");else a.elementId==="title"&&t.title?c=t.title:a.elementId==="date"&&(c=t.subtitle||new Date().getFullYear());l.textContent=c;const d=a.style||{};let p="sans-serif";d.font==="hebrew"?p="'Frank Ruhl Libre', serif":d.font==="script"?p="'Pinyon Script', 'Great Vibes', cursive":d.font==="accent"?p="'Cinzel', serif":d.font==="display"?p="'Cormorant Garamond', serif":d.font==="serif"?p="'Cormorant Garamond', 'Playfair Display', serif":d.font==="sans"?p="'Montserrat', 'Open Sans', sans-serif":d.font==="body"&&(p="'Heebo', serif"),s.titleFont&&(a.elementId==="title"||a.elementId==="groomName"||a.elementId==="brideName")&&(p=s.titleFont),s.bodyFont&&(a.elementId==="date"||a.elementId==="subtitle")&&(p=s.bodyFont);let u=d.color;u==="gold"&&(u=s.accentColor||"#C9A962"),u==="light"&&(u="#FDFCFA"),u==="secondary"&&(u="#B8B0A0"),u==="primary"&&(u=s.textColor||"#000000"),s.interactive&&t._userCustomTextColor&&(u=s.textColor);const g=t.textPositions&&t.textPositions[a.elementId]?t.textPositions[a.elementId]:null,m=a.size?.width||"100%";let y=d.size||"16px";parseInt(y)>48&&(y="48px");let b=`
                    position: absolute;
                    font-family: ${p};
                    font-size: ${y};
                    font-weight: ${d.weight||400};
                    color: ${u||"white"};
                    z-index: 10;
                    box-sizing: border-box;
                    word-break: break-word;
                    overflow-wrap: break-word;
                    line-height: ${d.lineHeight||"1.3"};
                `;if(g&&g.x)b+=`
                        left: ${g.x};
                        top: ${g.y};
                        text-align: right;
                    `,g.width&&(b+=`width: ${g.width};`);else{const f=a.position.x||"0%",x=a.position.y||"0%";d.align==="center"&&f==="50%"?b+=`
                            left: 50%;
                            top: ${x};
                            transform: translateX(-50%);
                            width: ${m};
                            text-align: center;
                            letter-spacing: ${d.letterSpacing||"normal"};
                            ${a.alignment?.method||""}
                        `:b+=`
                            left: ${f};
                            top: ${x};
                            width: ${m};
                            text-align: ${d.align||"center"};
                            letter-spacing: ${d.letterSpacing||"normal"};
                            ${a.alignment?.method||""}
                        `}l.style.cssText=b,/[\u0590-\u05FF]/.test(c)&&(l.style.direction="rtl",l.style.unicodeBidi="plaintext",!p.includes("Heebo")&&!p.includes("Rubik")&&!p.includes("Frank Ruhl")&&(l.style.fontFamily="'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Heebo', sans-serif"));const S=t.textStyles&&t.textStyles[a.elementId]||{};if(S.textAlign&&l.style.setProperty("text-align",S.textAlign,"important"),S.size){const f=S.size/100,x=l.style.transform||"";l.style.transform=x?`${x} scale(${f})`:`scale(${f})`,l.style.transformOrigin="center center"}if(r&&a.editable!==!1&&(l.dataset.selectableId=a.elementId,l.dataset.selectableType="cover-text",l.style.cursor="grab",l.style.border="1px solid transparent"),!S.size&&t.textStyles&&t.textStyles[a.elementId]&&t.textStyles[a.elementId].size){const f=t.textStyles[a.elementId].size/100,x=l.style.transform||"";l.style.transform=x?`${x} scale(${f})`:`scale(${f})`,l.style.transformOrigin="center center"}e.appendChild(l)}),n.decorations&&n.decorations.forEach(a=>{if(a.type==="goldLine"){const l=document.createElement("div");l.style.cssText=`
                        position: absolute;
                        left: ${a.position.x};
                        top: ${a.position.y};
                        width: ${a.size.width};
                        height: ${a.size.height};
                        background-color: #C9A962;
                        z-index: 5;
                    `,e.appendChild(l)}})}static createPhotoArea(e,t,{layout:o,interactive:s}){const n=document.createElement("div");if(n.className="cover-photo-area",e._coverGalleryId)return n.style.cssText=`
                pointer-events: none;
            `,n;const r=e.frontCrop||{},i=r.panX!==void 0?r.panX:50,a=r.panY!==void 0?r.panY:50;if(n.style.cssText=`
            background-size: cover;
            background-position: ${i}% ${a}%;
            background-repeat: no-repeat;
        `,e.frontPhotoId&&t?.photos){const l=t.photos.find(c=>c.id===e.frontPhotoId);if(l){const c=l.thumbnailUrl||l.url;n.style.backgroundImage=`url(${c})`}}else n.style.cssText+=`
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px dashed rgba(128,128,128,0.3);
                color: rgba(128,128,128,0.5);
                font-size: 14px;
                direction: rtl;
            `,n.textContent="גרור תמונה לכריכה הקדמית";return s&&(n.dataset.selectableId="cover-photo",n.dataset.selectableType="cover-photo"),n}static createTextArea(e,t){const{textColor:o,titleFont:s,bodyFont:n,interactive:r,textAlign:i="center"}=t,a=document.createElement("div");a.className="cover-text-area",a.style.cssText=`
            text-align: ${i};
            width: 100%;
            flex-shrink: 1;
            min-height: 0;
            overflow: visible;
            position: relative;
        `;const l=document.createElement("h1");l.textContent=e.title||"Album Title",l.style.cssText=`
            margin: 0;
            font-family: ${s};
            font-size: 28px;
            font-weight: 600;
            color: ${o};
            line-height: 1.2;
            word-break: break-word;
            overflow-wrap: break-word;
        `,r&&(l.dataset.selectableId="cover-title",l.dataset.selectableType="cover-text",e.textPositions&&e.textPositions["cover-title"]&&(l.style.position="absolute",l.style.left=e.textPositions["cover-title"].x,l.style.top=e.textPositions["cover-title"].y));const c=document.createElement("h3");if(c.textContent=e.subtitle||"",c.style.cssText=`
            margin: 8px 0 0;
            font-family: ${n};
            font-size: 16px;
            font-weight: 400;
            color: ${o};
            opacity: 0.85;
        `,r&&(c.dataset.selectableId="cover-subtitle",c.dataset.selectableType="cover-text",e.textPositions&&e.textPositions["cover-subtitle"]&&(c.style.position="absolute",c.style.left=e.textPositions["cover-subtitle"].x,c.style.top=e.textPositions["cover-subtitle"].y)),e.textStyles){if(e.textStyles["cover-title"]&&e.textStyles["cover-title"].size){const g=e.textStyles["cover-title"].size/100;l.style.transform=l.style.transform&&l.style.transform!=="none"?l.style.transform+` scale(${g})`:`scale(${g})`}if(e.textStyles["cover-subtitle"]&&e.textStyles["cover-subtitle"].size){const g=e.textStyles["cover-subtitle"].size/100;c.style.transform=c.style.transform&&c.style.transform!=="none"?c.style.transform+` scale(${g})`:`scale(${g})`}}a.appendChild(l),e.subtitle&&a.appendChild(c);const d=/[\u0590-\u05FF]/,p=d.test(e.title||""),u=d.test(e.subtitle||"");return(p||u)&&(a.style.direction="rtl",i!=="center"&&(a.style.textAlign="right"),p&&(l.style.fontFamily="'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Heebo', sans-serif",l.style.direction="rtl"),u&&(c.style.fontFamily="'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Heebo', sans-serif",c.style.direction="rtl")),a}static renderThumbnail(e,t,{bgColor:o,textColor:s,titleFont:n}){const r=document.createElement("div");r.className="cover-thumbnail",r.style.cssText=`
            width: 100%;
            height: 100%;
            display: flex;
            background-color: ${o};
            position: relative;
            border-radius: 2px;
            overflow: hidden;
        `;const i=document.createElement("div");i.style.cssText=`
            width: 4px;
            height: 100%;
            background-color: ${o};
            filter: brightness(0.9);
        `;const a=document.createElement("div");if(a.style.cssText=`
            flex: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 5%;
            box-sizing: border-box;
        `,!e._coverGalleryId&&e.frontPhotoId&&t?.photos){const u=t.photos.find(g=>g.id===e.frontPhotoId);if(u){const g=document.createElement("div");g.style.cssText=`
                    width: 60%;
                    height: 50%;
                    background-image: url(${u.thumbnailUrl||u.url});
                    background-size: cover;
                    background-position: center;
                    margin-bottom: 5%;
                `,a.appendChild(g)}}const l=document.createElement("div"),c=e.title||"Cover";l.textContent=c,l.style.cssText=`
            font-family: ${n};
            font-size: 8px;
            color: ${s};
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 90%;
        `,/[\u0590-\u05FF]/.test(c)&&(l.style.direction="rtl",l.style.fontFamily="'Fredoka', 'Heebo', sans-serif"),a.appendChild(l),r.appendChild(i),r.appendChild(a);const p=document.createElement("div");return p.textContent="Cover",p.style.cssText=`
            position: absolute;
            bottom: 2px;
            right: 2px;
            font-size: 6px;
            color: ${s};
            opacity: 0.6;
        `,r.appendChild(p),r}static renderToContainer(e,t,o,s,n=!0){return this.render({cover:t,assets:o,templateConfig:s,container:e,interactive:n,thumbnail:!1})}static renderTimelineThumbnail(e,t,o){return this.render({cover:e,assets:t,templateConfig:o,container:null,interactive:!1,thumbnail:!0})}}class Et{constructor(e){this.app=e,this.isOpen=!1,this.init()}init(){this.createModal(),this.bindEvents()}createModal(){if(document.getElementById("profile-modal"))return;const e=document.createElement("div");e.id="profile-modal",e.className="profile-modal",e.style.display="none",e.innerHTML=`
            <div class="profile-content">
                <button class="profile-close-btn">&times;</button>
                <div class="profile-header">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin:0;">הפרופיל שלי</h2>
                        <button id="btn-modal-logout" class="btn-sm btn-danger">התנתק</button>
                    </div>
                    <div class="profile-tabs">
                        <button class="tab-btn active" data-tab="projects">הפרויקטים שלי</button>
                        <button class="tab-btn" data-tab="billing">חיובים וחשבוניות</button>
                    </div>
                </div>
                
                <div class="tab-content active" id="tab-projects" dir="rtl">
                    <div class="projects-list-container">
                        <div class="loading-spinner">טוען פרויקטים...</div>
                        <ul class="projects-list"></ul>
                    </div>
                </div>

                <div class="tab-content" id="tab-billing" dir="rtl">
                   <div class="billing-list-container">
                        <div class="loading-spinner">טוען רכישות...</div>
                        <ul class="billing-list"></ul>
                    </div>
                </div>
            </div>
            <style>
                .profile-modal {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.8); z-index: 10000;
                    display: flex; align-items: center; justify-content: center;
                    backdrop-filter: blur(5px); font-family: 'Rubik', sans-serif;
                }
                .profile-content {
                    background: #1e1e2e; color: #fff; width: 800px; max-width: 95vw; height: 600px; max-height: 85vh;
                    border-radius: 12px; display: flex; flex-direction: column;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5); position: relative;
                }
                .profile-close-btn {
                    position: absolute; top: 15px; right: 20px; font-size: 24px;
                    background: none; border: none; color: #aaa; cursor: pointer;
                }
                .profile-header {
                    padding: 20px 30px; border-bottom: 1px solid #333;
                }
                .profile-tabs { display: flex; gap: 20px; margin-top: 20px; }
                .tab-btn {
                    background: none; border: none; color: #aaa; font-size: 16px; 
                    padding-bottom: 8px; cursor: pointer; border-bottom: 2px solid transparent;
                }
                .tab-btn.active { color: #fff; border-color: #a855f7; }
                .tab-content { padding: 30px; flex: 1; overflow-y: auto; display: none; }
                .tab-content.active { display: block; }
                
                .projects-list, .billing-list { list-style: none; padding: 0; margin: 0; }
                .project-item, .billing-item {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 15px; border-bottom: 1px solid #333; transition: background 0.2s;
                }
                .project-item:hover { background: rgba(255,255,255,0.05); }
                .project-info h4 { margin: 0 0 5px 0; color: #fff; }
                .project-info p { margin: 0; font-size: 12px; color: #888; }
                .project-actions { display: flex; gap: 10px; }
                .btn-sm {
                    padding: 6px 12px; border-radius: 4px; border: 1px solid #444;
                    background: #333; color: #fff; cursor: pointer; font-size: 12px;
                }
                .btn-sm:hover { background: #444; }
                .btn-primary { background: #a855f7; border-color: #a855f7; }
                .btn-primary:hover { background: #9333ea; }
                .btn-danger { color: #ff6b6b; border-color: #552222; background: #2a1111; }
                .btn-danger:hover { background: #401111; }

                .project-current-badge {
                    background: #22c55e; color: #000; padding: 2px 6px; 
                    border-radius: 4px; font-size: 10px; font-weight: bold; margin-left: 8px;
                }
                .billing-status {
                     padding: 4px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase;
                }
                .status-COMPLETED { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
                .status-PENDING { background: rgba(234, 179, 8, 0.2); color: #facc15; }
            </style>
        `,document.body.appendChild(e),e.querySelector(".profile-close-btn").addEventListener("click",()=>this.close()),e.addEventListener("click",s=>{s.target===e&&this.close()});const t=e.querySelector("#btn-modal-logout");t&&t.addEventListener("click",async()=>{confirm("להתנתק?")&&(await J.signOut(),this.close())});const o=e.querySelectorAll(".tab-btn");o.forEach(s=>{s.addEventListener("click",()=>{o.forEach(n=>n.classList.remove("active")),e.querySelectorAll(".tab-content").forEach(n=>n.classList.remove("active")),s.classList.add("active"),e.getElementById(`tab-${s.dataset.tab}`).classList.add("active"),s.dataset.tab==="projects"&&this.loadProjects(),s.dataset.tab==="billing"&&this.loadBilling()})})}bindEvents(){window.addEventListener("open-profile",()=>this.open())}open(){const e=document.getElementById("profile-modal");e&&(e.style.display="flex",this.loadProjects())}close(){const e=document.getElementById("profile-modal");e&&(e.style.display="none")}async loadProjects(){const e=document.querySelector(".projects-list"),t=document.querySelector("#tab-projects .loading-spinner");if(e){e.innerHTML="",t.style.display="block";try{const o=await U.listProjects();if(t.style.display="none",o.length===0){e.innerHTML='<div style="padding:20px; text-align:center; color:#666">אין פרויקטים שמורים עדיין.</div>';return}const s=U.currentProjectId;o.forEach(n=>{const r=document.createElement("li");r.className="project-item";const i=s===n.id,a=i?'<span class="project-current-badge">פעיל</span>':"",l=new Date(n.lastModified).toLocaleDateString()+" "+new Date(n.lastModified).toLocaleTimeString();r.innerHTML=`
                    <div class="project-info">
                        <h4>${n.name||"פרויקט ללא שם"} ${a}</h4>
                        <p>שונה לאחרונה: ${l}</p>
                    </div>
                    <div class="project-actions">
                        <button class="btn-sm btn-rename" data-id="${n.id}" data-name="${n.name}">שינוי שם</button>
                        ${i?"":`<button class="btn-sm btn-primary btn-load" data-id="${n.id}">טען</button>`}
                        <button class="btn-sm btn-danger btn-delete" data-id="${n.id}">מחק</button>
                    </div>
                `,r.querySelector(".btn-rename").addEventListener("click",()=>this.handleRename(n)),i||r.querySelector(".btn-load").addEventListener("click",()=>this.handleLoad(n.id)),r.querySelector(".btn-delete").addEventListener("click",()=>this.handleDelete(n.id)),e.appendChild(r)})}catch(o){console.error(o),t.style.display="none",e.innerHTML='<div class="error">Failed to load projects.</div>'}}}async handleRename(e){const t=prompt("הזן שם חדש:",e.name);if(t&&t.trim()!==""&&t!==e.name)try{await U.renameProject(e.id,t),this.loadProjects()}catch(o){alert("שינוי שם נכשל: "+o.message)}}async handleLoad(e){if(confirm("לטעון את הפרויקט הזה? כל שינוי שלא נשמר יאבד."))try{const t=await U.loadProject(J.getCurrentUser().uid,e);t&&(this.app.renderAlbumPages(t),this.close())}catch(t){alert("טעינה נכשלה: "+t.message)}}async handleDelete(e){if(confirm("האם אתה בטוח שברצונך למחוק פרויקט זה? לא ניתן לבטל פעולה זו."))try{await U.deleteProject(e),this.loadProjects()}catch(t){alert("מחיקה נכשלה: "+t.message)}}async loadBilling(){const e=document.querySelector(".billing-list"),t=document.querySelector("#tab-billing .loading-spinner");if(!e)return;e.innerHTML="",t.style.display="block";const s=J.getFunctions().httpsCallable("listPurchases");try{const r=(await s()).data.purchases||[];if(t.style.display="none",r.length===0){e.innerHTML='<div style="padding:20px; text-align:center; color:#666">אין רכישות עדיין.</div>';return}r.forEach(i=>{const a=document.createElement("li");a.className="billing-item";const l=i.createdAt?new Date(i.createdAt).toLocaleDateString():"תאריך לא זמין",c=(i.currency||"ILS")+" "+(i.amount||""),d=i.status||"PENDING";a.innerHTML=`
                    <div class="project-info">
                        <h4>הזמנה #${i.id.substring(0,8)}...</h4>
                        <p>${l} • ${c}</p>
                        ${i.trackingUrl?`<p style="margin-top: 5px;"><a href="${i.trackingUrl}" target="_blank" style="color: #60a5fa; text-decoration: underline;">מעקב משלוח הזמנה</a></p>`:""}
                    </div>
                    <div class="project-actions">
                        <span class="billing-status status-${d}">${d}</span>
                        ${i.invoiceUrl?`<a href="${i.invoiceUrl}" target="_blank" class="btn-sm">חשבונית</a>`:""}
                    </div>
                `,e.appendChild(a)})}catch(n){console.error(n),t.style.display="none",e.innerHTML='<div class="error">טעינת היסטוריית חיובים נכשלה.</div>'}}}const Fe=[{fg:"#6C3483",bg:"#F5EEF8",name:"Purple"},{fg:"#1A5276",bg:"#EBF5FB",name:"Ocean Blue"},{fg:"#B7950B",bg:"#FEF9E7",name:"Gold"},{fg:"#922B21",bg:"#FDEDEC",name:"Crimson"},{fg:"#117A65",bg:"#E8F8F5",name:"Emerald"},{fg:"#D35400",bg:"#FDF2E9",name:"Tangerine"},{fg:"#2E86C1",bg:"#EAF2F8",name:"Sky Blue"},{fg:"#7D3C98",bg:"#F4ECF7",name:"Amethyst"},{fg:"#C0392B",bg:"#FDEDEC",name:"Cherry"},{fg:"#16A085",bg:"#E8F6F3",name:"Teal"}];let Ae=0,xe=null,ce=null;function $e(){return xe?Promise.resolve(xe):ce||(ce=new Promise(P=>{const e=new Image;e.crossOrigin="anonymous",e.onload=()=>{xe=e,P(e)},e.onerror=()=>{console.warn("[QR] Failed to load Shoso logo"),P(null)},e.src="/favicon.svg"}),ce)}function kt(){const P=Fe[Ae%Fe.length];return Ae++,P}function Tt(P){const e=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(P);return e?{r:parseInt(e[1],16),g:parseInt(e[2],16),b:parseInt(e[3],16)}:{r:0,g:0,b:0}}async function Lt(P,e={}){const{size:t=256,color:o=null,withLogo:s=!0,logoRatio:n=.22,margin:r=1}=e,i=o||kt();if(typeof window.qrcode!="function")throw new Error("[QR] qrcode-generator library not loaded. Ensure the CDN script is included.");const a=window.qrcode(0,"H");a.addData(P),a.make();const l=a.getModuleCount(),c=Math.floor((t-r*2)/l),d=c*l+r*2,p=document.createElement("canvas");p.width=d,p.height=d;const u=p.getContext("2d");u.fillStyle=i.bg,u.fillRect(0,0,d,d),Tt(i.fg),u.fillStyle=i.fg;const g=c*.3;for(let w=0;w<l;w++)for(let b=0;b<l;b++)if(a.isDark(w,b)){const v=r+b*c,S=r+w*c;u.beginPath(),u.roundRect(v+.5,S+.5,c-1,c-1,g),u.fill()}u.save();const m=d*.03;if(u.strokeStyle=i.fg,u.lineWidth=2,u.beginPath(),u.roundRect(1,1,d-2,d-2,m),u.stroke(),u.restore(),s){const w=await $e();if(w){const b=d*n,v=(d-b)/2,S=(d-b)/2,f=4,x=b*.22;u.save(),u.beginPath(),u.roundRect(v-f,S-f,b+f*2,b+f*2,x),u.fillStyle=i.bg,u.fill(),u.restore(),u.drawImage(w,v,S,b,b)}}return{dataUrl:p.toDataURL("image/png"),color:i}}function Ft(P){return[/youtube\.com\/watch/i,/youtu\.be\//i,/youtube\.com\/shorts/i,/vimeo\.com\//i,/tiktok\.com\//i,/instagram\.com\/reel/i,/facebook\.com\/.*video/i].some(t=>t.test(P))}function At(P,e,t,o={}){return{id:`qr_${Date.now()}_${Math.floor(Math.random()*1e3)}`,type:"qr",url:e,targetUrl:P,isVideo:Ft(P),colorName:t?.name||"Custom",x:o.x??85,y:o.y??85,pixelWidth:"80px",pixelHeight:"80px",zIndex:15}}$e();class _t{constructor(e){this.app=e,this.modal=document.getElementById("projects-modal"),this.btnOpen=document.getElementById("btn-my-projects"),this.btnManualSave=document.getElementById("btn-manual-save"),this.listContainer=document.getElementById("projects-list-container"),this.bindEvents()}bindEvents(){this.btnOpen&&this.btnOpen.addEventListener("click",()=>this.openModal()),this.btnManualSave&&this.btnManualSave.addEventListener("click",async()=>{await this.performManualSave()})}async openModal(){this.modal.style.display="flex",await this.renderList()}async renderList(){this.listContainer.innerHTML='<div style="text-align: center; color: #64748b; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> טוען...</div>';try{const e=await U.listProjects();if(!e||e.length===0){this.listContainer.innerHTML=`
                    <div style="text-align: center; color: #64748b; padding: 40px 20px; background: rgba(255,255,255,0.02); border-radius: 8px;">
                        <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                        <div>אין פרויקטים שמורים.</div>
                    </div>
                `;return}this.listContainer.innerHTML="",e.forEach(t=>{const o=U.currentProjectId===t.id,s=new Date(t.lastModified),n=t.title||"פרויקט ללא שם",r=document.createElement("div");r.style.cssText=`
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: ${o?"rgba(59, 130, 246, 0.1)":"rgba(255,255,255,0.05)"};
                    border: 1px solid ${o?"#3b82f6":"transparent"};
                    padding: 15px;
                    border-radius: 8px;
                    transition: background 0.2s;
                `;const i=document.createElement("div");i.style.flex="1",i.innerHTML=`
                    <div style="font-weight: 500; font-size: 1.1rem; color: #f8fafc; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                        ${n}
                        ${o?'<span style="font-size: 0.7rem; background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px;">פעיל כעת</span>':""}
                    </div>
                    <div style="font-size: 0.85rem; color: #94a3b8; display: flex; gap: 15px;">
                        <span><i class="fa-regular fa-clock"></i> ${s.toLocaleDateString("he-IL")} ${s.toLocaleTimeString("he-IL")}</span>
                        <span><i class="fa-solid fa-database"></i> ${t.source==="local"?"מקומי":"ענן"}</span>
                    </div>
                `;const a=document.createElement("div");if(a.style.display="flex",a.style.gap="8px",!o){const c=document.createElement("button");c.className="btn-primary",c.innerHTML='<i class="fa-solid fa-folder-open"></i> טען',c.style.background="#3b82f6",c.style.borderColor="#3b82f6",c.style.padding="8px 12px",c.onclick=()=>this.loadProject(t.id),a.appendChild(c)}const l=document.createElement("button");l.innerHTML='<i class="fa-solid fa-trash"></i>',l.style.cssText=`
                    background: transparent;
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 6px;
                    padding: 8px 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                `,l.onmouseover=()=>l.style.background="rgba(239, 68, 68, 0.1)",l.onmouseout=()=>l.style.background="transparent",l.onclick=()=>this.deleteProject(t.id),a.appendChild(l),r.appendChild(i),r.appendChild(a),this.listContainer.appendChild(r)})}catch(e){console.error("Failed to list projects",e),this.listContainer.innerHTML='<div style="color: #ef4444; padding: 20px;">שגיאה בטעינת פרויקטים. נסה שוב מאוחר יותר.</div>'}}async performManualSave(){const e=this.btnManualSave.innerHTML;this.btnManualSave.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> שומר...',this.btnManualSave.disabled=!0;try{await U.saveProject(h.state.user?.uid||null,h.state),this.btnManualSave.innerHTML='<i class="fa-solid fa-check"></i> נשמר!',this.btnManualSave.style.background="#10b981",await this.renderList()}catch{this.btnManualSave.innerHTML='<i class="fa-solid fa-triangle-exclamation"></i> שגיאה',this.btnManualSave.style.background="#ef4444"}setTimeout(()=>{this.btnManualSave&&(this.btnManualSave.innerHTML=e,this.btnManualSave.disabled=!1,this.btnManualSave.style.background="#27ae60")},2500)}async loadProject(e){if(!confirm("טעינת פרויקט זה תחליף את העבודה הנוכחית שלך. האם להמשיך?"))return;this.modal.style.display="none";const t=document.getElementById("btn-my-projects")||document.getElementById("btn-new-project"),o=t?t.innerHTML:"";t&&(t.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>');try{const s=await U.loadProject(h.state.user?.uid||null,e);if(s){s.pages&&s.pages.length>0&&(s.pages.find(r=>r.id===s.activePageId)||(s.activePageId=s.pages[0].id)),h._isBatchUpdating=!0,Object.assign(h.state,{...s,user:h.state.user,assets:s.assets||{photos:[]}}),h._isBatchUpdating=!1,h.notify("pages",h.state.pages),h.notify("cover",h.state.cover),h.notify("assets",h.state.assets),this.app.renderAssetSidebar&&this.app.renderAssetSidebar();const n=(h.state.pages&&h.state.pages[0]?h.state.pages[0].templateId:null)||(h.state.cover?h.state.cover.templateId:null);n&&this.app.templateSidebar&&this.app.templateSidebar.manager&&this.app.templateSidebar.manager.loadTemplate(n).then(()=>{window.pdfExport&&window.pdfExport.setTemplateConfig(this.app.templateSidebar.manager.config)}).catch(r=>console.error("Template load err",r)),h.state.viewMode==="cover"?this.app.renderCoverWithTemplate():this.app.renderActivePage(),console.log(`[ProjectManager] Successfully loaded project ${e}`),U.updateSaveUI("נטען בהצלחה")}else alert("שגיאה! הנתונים לא נמצאו או פגומים.")}catch(s){console.error("Failed to load project from UI",s),alert("שגיאה בטעינת הפרויקט.")}finally{t&&(t.innerHTML=o)}}async deleteProject(e){if(confirm("האם אתה בטוח שברצונך למחוק פרויקט זה לצמיתות? פעולה זו אינה ניתנת לביטול."))try{await U.deleteProject(e),await this.renderList()}catch(t){console.error("Failed to delete project",t),alert("שגיאה במחיקת הפרויקט.")}}}class $t{constructor(){this.cache=new Map,this._geoCache=new Map}async extractFromFile(e){try{const t=await e.arrayBuffer(),o=new DataView(t);if(o.getUint16(0)!==65496)return this._empty();let s=2;for(;s<o.byteLength-4;){const n=o.getUint16(s);if(n===65505){const i=o.getUint16(s+2);return this._parseExifSegment(o,s+4,i-2)}if((n&65280)!==65280)break;const r=o.getUint16(s+2);s+=2+r}return this._empty()}catch(t){return console.warn("[ExifService] Parse error:",t.message),this._empty()}}async extractFromPhoto(e,t=!1){if(this.cache.has(e.id))return this.cache.get(e.id);let o=this._empty();try{if(e.file&&e.file instanceof File)o=await this.extractFromFile(e.file);else if(e.url&&(e.url.startsWith("blob:")||e.url.startsWith("data:"))){const n=await(await fetch(e.url)).blob();o=await this.extractFromFile(n)}!t&&o.lat!==null&&o.lon!==null&&(o.location=await this._reverseGeocode(o.lat,o.lon))}catch(s){console.warn(`[ExifService] Failed for photo ${e.id}:`,s.message)}return this.cache.set(e.id,o),o}async extractBatch(e){const t=new Map,o=5;for(let r=0;r<e.length;r+=o){const i=e.slice(r,r+o),a=await Promise.all(i.map(l=>this.extractFromPhoto(l,!0)));i.forEach((l,c)=>t.set(l.id,a[c]))}const s=[];t.forEach((r,i)=>{if(r.lat!==null&&r.lon!==null){const a=`${r.lat.toFixed(2)},${r.lon.toFixed(2)}`;this._geoCache.has(a)||s.push({photoId:i,lat:r.lat,lon:r.lon,key:a})}});const n=new Map;s.forEach(r=>{n.has(r.key)||n.set(r.key,r)}),console.log(`[ExifService] Need to geocode ${n.size} unique locations (from ${s.length} photos with GPS)`);for(const[,r]of n)await this._reverseGeocode(r.lat,r.lon),n.size>1&&await new Promise(i=>setTimeout(i,1200));return t.forEach((r,i)=>{if(r.lat!==null&&r.lon!==null){const a=`${r.lat.toFixed(2)},${r.lon.toFixed(2)}`,l=this._geoCache.get(a);if(l&&(r.location=l),!r.location){const c=`${r.lat.toFixed(3)},${r.lon.toFixed(3)}`,d=this._geoCache.get(c);d&&(r.location=d)}}t.set(i,r)}),t}_parseExifSegment(e,t,o){if(String.fromCharCode(e.getUint8(t),e.getUint8(t+1),e.getUint8(t+2),e.getUint8(t+3))!=="Exif")return this._empty();const n=t+6,i=e.getUint16(n)===18761;if(e.getUint16(n+2,i)!==42)return this._empty();const a=e.getUint32(n+4,i);let l={lat:null,lon:null,date:null,dateFormatted:null};const c=this._parseIFD(e,n,a,i);if(c.exifIFDPointer){const d=this._parseIFD(e,n,c.exifIFDPointer,i);d.dateTimeOriginal&&(l.date=d.dateTimeOriginal,l.dateFormatted=this._formatDate(d.dateTimeOriginal))}if(!l.date&&c.dateTime&&(l.date=c.dateTime,l.dateFormatted=this._formatDate(c.dateTime)),c.gpsIFDPointer){const d=this._parseGPSIFD(e,n,c.gpsIFDPointer,i);d.lat!==null&&(l.lat=d.lat,l.lon=d.lon)}return l}_parseIFD(e,t,o,s){const n={},r=t+o;if(r+2>e.byteLength)return n;const i=e.getUint16(r,s);for(let a=0;a<i;a++){const l=r+2+a*12;if(l+12>e.byteLength)break;const c=e.getUint16(l,s),d=e.getUint16(l+2,s),p=e.getUint32(l+4,s),u=e.getUint32(l+8,s);switch(c){case 34665:n.exifIFDPointer=u;break;case 34853:n.gpsIFDPointer=u;break;case 306:n.dateTime=this._readString(e,t,u,p,d,l+8,s);break}}return n}_parseGPSIFD(e,t,o,s){const n=t+o,r={lat:null,lon:null};if(n+2>e.byteLength)return r;const i=e.getUint16(n,s);let a="N",l="E",c=null,d=null;for(let p=0;p<i;p++){const u=n+2+p*12;if(u+12>e.byteLength)break;const g=e.getUint16(u,s);e.getUint16(u+2,s),e.getUint32(u+4,s);const m=e.getUint32(u+8,s);switch(g){case 1:a=String.fromCharCode(e.getUint8(u+8));break;case 2:c=this._readRationals(e,t+m,3,s);break;case 3:l=String.fromCharCode(e.getUint8(u+8));break;case 4:d=this._readRationals(e,t+m,3,s);break}}return c&&d&&(r.lat=this._dmsToDecimal(c,a),r.lon=this._dmsToDecimal(d,l)),r}_readRationals(e,t,o,s){const n=[];for(let r=0;r<o&&!(t+r*8+8>e.byteLength);r++){const i=e.getUint32(t+r*8,s),a=e.getUint32(t+r*8+4,s);n.push(a!==0?i/a:0)}return n}_readString(e,t,o,s,n,r,i){const a=s<=4?r:t+o;let l="";for(let c=0;c<s-1&&a+c<e.byteLength;c++)l+=String.fromCharCode(e.getUint8(a+c));return l.trim()}_dmsToDecimal(e,t){if(!e||e.length<3)return null;let o=e[0]+e[1]/60+e[2]/3600;return(t==="S"||t==="W")&&(o=-o),Math.round(o*1e6)/1e6}_formatDate(e){if(!e)return null;const t=e.match(/(\d{4}):(\d{2}):(\d{2})/);return t?`${t[3]}/${t[2]}/${t[1]}`:null}async _reverseGeocode(e,t){const o=`${e.toFixed(2)},${t.toFixed(2)}`;if(this._geoCache.has(o))return this._geoCache.get(o);const s=`${e.toFixed(3)},${t.toFixed(3)}`;if(this._geoCache.has(s)){const r=this._geoCache.get(s);return this._geoCache.set(o,r),r}const n=3;for(let r=0;r<n;r++)try{const i=`https://nominatim.openstreetmap.org/reverse?lat=${e}&lon=${t}&format=json&accept-language=he&zoom=10`,a=await fetch(i,{headers:{"User-Agent":"ShoshoPhotobook/1.0"}});if(a.status===429){console.warn(`[ExifService] Nominatim 429 rate limit, retry ${r+1}/${n}...`),await new Promise(u=>setTimeout(u,2e3*(r+1)));continue}if(!a.ok)return null;const l=await a.json(),c=l.address||{},d={city:c.city||c.town||c.village||c.hamlet||c.municipality||null,state:c.state||c.province||null,country:c.country||null,countryCode:c.country_code?.toUpperCase()||null,displayName:null},p=[d.city,d.country].filter(Boolean);return d.displayName=p.join(", ")||l.display_name?.split(",").slice(0,2).join(",")||null,this._geoCache.set(o,d),this._geoCache.set(s,d),console.log(`[ExifService] Geocoded ${e.toFixed(3)},${t.toFixed(3)} → ${d.displayName}`),d}catch(i){if(r<n-1){await new Promise(a=>setTimeout(a,1500*(r+1)));continue}return console.warn("[ExifService] Geocoding failed after retries:",i.message),this._geoCache.set(o,null),null}return this._geoCache.set(o,null),null}_empty(){return{lat:null,lon:null,date:null,dateFormatted:null,location:null}}}const Me=new $t;window.exifService=Me;class Mt{constructor(){this.analysisCache=new Map,this._analyzing=!1}async analyzePhotos(e,t=null){if(!e||e.length===0)return{recommended:[],notRecommended:[],duplicates:[],analyses:new Map};this._analyzing=!0;const o=new Map;try{if(this._needsServerSideAnalysis(e))console.log("[PhotoQuality] Google Photos detected — using server-side Vertex AI analysis"),await this._analyzeServerSide(e,o,t);else if(ie.apiKey)await this._analyzeClientSide(e,o,t);else return console.warn("[PhotoQuality] No Gemini API key – skipping analysis"),{recommended:e,notRecommended:[],duplicates:[],analyses:new Map}}finally{this._analyzing=!1}const s=[],n=[],r=[];return e.forEach(i=>{const a=o.get(i.id)||this._defaultAnalysis(i);o.set(i.id,a),a.duplicateGroupId&&!a.isBestInGroup?r.push({...i,_analysis:a}):a.qualityScore>=65&&!a.isTrash&&!a.headCutOff&&(!a.issues||!a.issues.includes("head_cut_off"))?s.push({...i,_analysis:a}):n.push({...i,_analysis:a})}),{recommended:s,notRecommended:n,duplicates:r,analyses:o}}_needsServerSideAnalysis(e){return e.some(t=>{const o=t.thumbnailUrl||t.rawBaseUrl||t.url||"";return o.includes("googleusercontent.com")||o.includes("google.com/photos")})}async _analyzeServerSide(e,t,o){const n="https://us-central1-shoso-photobook.cloudfunctions.net";for(let r=0;r<e.length;r+=16){const i=e.slice(r,r+16);try{const a=i.map(d=>({id:d.id,url:d.url,thumbnailUrl:d.thumbnailUrl,rawBaseUrl:d.rawBaseUrl,name:d.name})),l=await fetch(`${n}/magic/analyze-photos`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({photos:a})});if(!l.ok)throw new Error(`Server responded ${l.status}`);const c=await l.json();c.analyses?i.forEach(d=>{const p=c.analyses[d.id];p?(t.set(d.id,p),this.analysisCache.set(d.id,p)):t.set(d.id,this._defaultAnalysis(d))}):i.forEach(d=>{const p=(c.trash_photos||[]).find(u=>u.id===d.id);if(p&&p._analysis)t.set(d.id,p._analysis);else{const u=(c.valid_photos||[]).find(g=>g.id===d.id);u&&u._analysis?t.set(d.id,u._analysis):t.set(d.id,this._defaultAnalysis(d))}})}catch(a){console.warn("[PhotoQuality] Server-side analysis failed:",a.message),i.forEach(l=>{t.set(l.id,this._defaultAnalysis(l))})}o&&o(Math.min(r+16,e.length),e.length)}}async _analyzeClientSide(e,t,o){console.log("[PhotoQuality] Extracting EXIF metadata...");const n=await Me.extractBatch(e);console.log("[PhotoQuality] EXIF extracted. Photos with GPS:",[...n.values()].filter(r=>r.lat!==null).length);for(let r=0;r<e.length;r+=16){const i=e.slice(r,r+16),a=await Promise.all(i.map(c=>this._photoToBase64(c))),l=i.map((c,d)=>({photo:c,base64:a[d],exif:n.get(c.id)||null})).filter(c=>c.base64!==null);if(l.length===0){console.warn("[PhotoQuality] No photos convertible to base64, trying server-side..."),await this._analyzeServerSide(i,t,null);continue}try{(await this._analyzeWithGemini(l)).forEach((d,p)=>{const u=l[p]?.photo,g=l[p]?.exif;u&&(g&&(d.exifLocation=g.location,d.exifDate=g.dateFormatted,d.exifCoords=g.lat!==null?{lat:g.lat,lon:g.lon}:null,g.location?.displayName&&d.description_he&&(d.description_he.includes(g.location.city||"___")||(d.description_he+=` (${g.location.displayName})`))),t.set(u.id,d),this.analysisCache.set(u.id,d))})}catch(c){console.warn("[PhotoQuality] Gemini analysis failed, using fallback:",c.message),l.forEach(d=>{t.set(d.photo.id,this._defaultAnalysis(d.photo))})}o&&o(Math.min(r+16,e.length),e.length)}this._detectCrossBatchDuplicates(t)}_detectCrossBatchDuplicates(e){const t=[...e.entries()];if(t.length<2)return;const o=t.filter(([,n])=>!n.duplicateGroupId);if(o.length<2)return;let s=0;for(let n=0;n<o.length;n++){const[r,i]=o[n];if(!i.duplicateGroupId)for(let a=n+1;a<o.length;a++){const[l,c]=o[a];if(c.duplicateGroupId||i.sceneType!==c.sceneType||i.hasPeople!==c.hasPeople||i.mood!==c.mood)continue;if(this._descriptionOverlap(i.description_he,c.description_he)>=.55){s++;const p=`xbatch_${s}`,u=(i.qualityScore??70)>=(c.qualityScore??70);i.duplicateGroupId=p,i.isBestInGroup=u,c.duplicateGroupId=p,c.isBestInGroup=!u,e.set(r,i),e.set(l,c)}}}}_descriptionOverlap(e,t){if(!e||!t)return 0;const o=i=>new Set(i.replace(/[^\u0590-\u05FF\w]/g," ").split(/\s+/).filter(a=>a.length>2)),s=o(e),n=o(t);if(s.size===0||n.size===0)return 0;let r=0;return s.forEach(i=>{n.has(i)&&r++}),r/Math.min(s.size,n.size)}getFaceData(e){const t=this.analysisCache.get(e);return!t||!t.faces||t.faces.length===0?null:{focalX:t.focalX,focalY:t.focalY,faces:t.faces}}async _analyzeWithGemini(e){const t=e.map((m,y)=>({inlineData:{mimeType:m.base64.startsWith("data:image/png")?"image/png":"image/jpeg",data:m.base64.replace(/^data:image\/\w+;base64,/,"")}})),o=e.map((m,y)=>`  Image ${y}: appears at position ${y} in the request`).join(`
`),n={contents:[{parts:[{text:`You are a professional photo editor and album curator AI. Analyze ${e.length} photo(s) for album quality.

CRITICAL: The images are provided in this exact order — you MUST match each result's "index" to the correct image:
${o}

Analyze the ACTUAL VISUAL CONTENT of each image — what you literally SEE in THAT specific image. Do NOT mix up descriptions between images.

For EACH photo (in order), return a JSON array:

[
  {
    "index": 0,
    "qualityScore": 0-100,
    "isTrash": true/false,
    "issues": ["blurry", "too_dark", "too_bright", "bad_composition", "duplicate", "low_resolution", "overexposed", "underexposed", "noisy", "screenshot", "head_cut_off"],
    "description_he": "תיאור מדויק בעברית של מה שנראה בתמונה",
    "reason_he": "סיבה קצרה בעברית למה כדאי/לא כדאי להכניס לאלבום",
    "reason_en": "Short reason in English",
    "faces": [
      {
        "centerX": 0-100,
        "centerY": 0-100,
        "width": 0-100,
        "height": 0-100,
        "headTop": 0-100
      }
    ],
    "headTop": 0-100,
    "headCutOff": false,
    "focalX": 0-100,
    "focalY": 0-100,
    "hasPeople": true/false,
    "sceneType": "portrait|group|landscape|food|event|object|animal|architecture|nature|screenshot|other",
    "mood": "happy|calm|dramatic|fun|romantic|sad|energetic|mysterious|other",
    "duplicateGroupId": null,
    "isBestInGroup": true
  }
]

DUPLICATE DETECTION (very important!):
- Compare ALL photos visually. If two or more look very similar (same scene/subjects/angle), give them the SAME duplicateGroupId (e.g. "group_A", "group_B").
- Within each group, mark the BEST one (sharpest, best expression, best headroom) with isBestInGroup: true. Others: false.
- Unique photos: duplicateGroupId: null, isBestInGroup: true.

HEAD DETECTION (critical for portraits):
- faces[*].headTop: topmost Y% of the head INCLUDING hair, hat, or any head covering. This is ABOVE centerY - height/2. Estimate generously — if unsure, add 10-15% above the face bounding box top.
- headTop (top-level): the minimum faces[*].headTop across all faces. null if no people.
- headCutOff: true if ANY person in the photo has their head/top-of-head visibly cut off at the image border. Add "head_cut_off" to issues and deduct 20-30 points from qualityScore.

ALBUM-WORTHINESS SCORING:
- 85-100: Exceptional — sharp focus on subjects, great lighting, genuine emotion or beautiful moment, no technical flaws, all faces complete
- 70-84: Good — clear subjects, decent lighting, minor imperfections acceptable
- 50-69: Mediocre — one significant problem (slightly blurry, flat lighting, awkward crop)
- 30-49: Poor — multiple problems or one severe problem
- 0-29: Unusable — extreme blur, extreme exposure, screenshot, or unidentifiable content
- PENALISE: head_cut_off (-25), closed eyes on all subjects (-15), extreme motion blur (-30), screenshot (-50)
- REWARD: genuine smiles/laughter (+10), sharp eyes in focus (+5), beautiful natural light (+5)

RULES:
- qualityScore: based on album-worthiness criteria above
- isTrash = true ONLY if genuinely unusable (very blurry, extremely dark/bright, screenshot, head_cut_off on primary subject)
- Screenshots: sceneType "screenshot", isTrash: true
- faces: bounding box as PERCENTAGE (0=left/top, 100=right/bottom). Empty if no faces.
- focalX/focalY: ideal focal point %. If faces, center of face group; otherwise main subject.
- description_he: Describe what you ACTUALLY see — be specific. No generic terms.
- issues: only actual problems you SEE.

Return ONLY valid JSON array. No markdown, no explanation.`},...t]}],generationConfig:{temperature:.15,maxOutputTokens:8192}},r=ie.apiKey;if(!r)throw new Error("Gemini API key not configured");const a=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${r}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(!a.ok){const m=await a.text();throw new Error(`Gemini API error ${a.status}: ${m.substring(0,300)}`)}const c=(await a.json()).candidates?.[0]?.content?.parts?.find(m=>m.text)?.text;if(!c)throw new Error("No text response from Gemini");let d=c;const p=c.match(/```json\n?([\s\S]*?)\n?```/);p&&(d=p[1]);const u=d.match(/\[[\s\S]*\]/);u&&(d=u[0]);const g=JSON.parse(d);return e.map((m,y)=>{const w=g.find(S=>S.index===y)||g[y]||{},b=(w.faces||[]).map(S=>({centerX:S.centerX??50,centerY:S.centerY??50,width:S.width??20,height:S.height??25,headTop:S.headTop??Math.max(0,(S.centerY??50)-(S.height??25)/2-(S.height??25)*.35)})),v=w.headTop??(b.length>0?Math.min(...b.map(S=>S.headTop)):null);return{qualityScore:w.qualityScore??70,isTrash:w.isTrash??!1,issues:w.issues||[],description_he:w.description_he||"",reason_he:w.reason_he||"",reason_en:w.reason_en||"",faces:b,headTop:v,headCutOff:w.headCutOff??!1,focalX:w.focalX??50,focalY:w.focalY??50,hasPeople:w.hasPeople??!1,sceneType:w.sceneType||"other",mood:w.mood||"other",duplicateGroupId:w.duplicateGroupId||null,isBestInGroup:w.isBestInGroup??!0}})}async _photoToBase64(e){try{let t=null;if(e.file&&e.file instanceof File)t=e.file;else if(e.url&&e.url.startsWith("data:"))t=await(await fetch(e.url)).blob();else if(e.url&&e.url.startsWith("blob:"))t=await(await fetch(e.url)).blob();else{const o=e.thumbnailUrl||e.rawBaseUrl||e.url;if(o){let s=o;s.includes("googleusercontent.com")&&!s.includes("=")&&(s+="=w800-h800"),t=await(await fetch(s)).blob()}}return t?await this._resizeImageBlob(t,800):null}catch(t){return console.warn(`[PhotoQuality] Failed to read photo ${e.id}:`,t.message),null}}async _resizeImageBlob(e,t){return new Promise(o=>{const s=new Image;s.onload=()=>{let n=s.width,r=s.height;if(n>t||r>t){const l=Math.min(t/n,t/r);n=Math.round(n*l),r=Math.round(r*l)}const i=document.createElement("canvas");i.width=n,i.height=r,i.getContext("2d").drawImage(s,0,0,n,r),o(i.toDataURL("image/jpeg",.85)),URL.revokeObjectURL(s.src)},s.onerror=()=>o(null),s.src=URL.createObjectURL(e)})}_defaultAnalysis(e){return{qualityScore:70,isTrash:!1,issues:[],description_he:"",reason_he:"",reason_en:"",faces:[],headTop:null,headCutOff:!1,focalX:50,focalY:50,hasPeople:!1,sceneType:"other",mood:"other",duplicateGroupId:null,isBestInGroup:!0}}getIssueLabel(e){return{blurry:"🔍 מטושטש",too_dark:"🌑 חשוך מדי",too_bright:"☀️ בהיר מדי",bad_composition:"📐 קומפוזיציה לא טובה",duplicate_looking:"👯 דומה לתמונה אחרת",duplicate:"👯 כפילות",low_resolution:"📏 רזולוציה נמוכה",overexposed:"💡 חשיפת יתר",underexposed:"🔅 חשיפת חסר",noisy:"📡 רעש",screenshot:"📱 סקרינשוט",head_cut_off:"✂️ ראש חתוך"}[e]||e}getQualityTier(e){return e>=80?{label:"מעולה",labelEn:"Excellent",color:"#22c55e",icon:"⭐"}:e>=60?{label:"טוב",labelEn:"Good",color:"#3b82f6",icon:"👍"}:e>=40?{label:"בינוני",labelEn:"Mediocre",color:"#f59e0b",icon:"⚠️"}:{label:"לא מומלץ",labelEn:"Not Recommended",color:"#ef4444",icon:"❌"}}}const pe=new Mt;window.photoQualityService=pe;class Dt{constructor(){this.injectStyles()}async review(e,t){if(!e||e.length===0){t([],new Map);return}this._skipRequested=!1,this._showAnalysisOverlay(e.length,()=>{this._skipRequested=!0,this._hideAnalysisOverlay(),t(e,new Map)});try{const o=await pe.analyzePhotos(e,(s,n)=>{this._skipRequested||this._updateAnalysisProgress(s,n)});if(this._skipRequested)return;this._hideAnalysisOverlay(),this._showReviewModal(o,e,t)}catch(o){if(this._skipRequested)return;console.error("[PhotoQualityModal] Error during analysis:",o),this._hideAnalysisOverlay(),t(e,new Map)}}_showAnalysisOverlay(e,t){const o=document.getElementById("pq-analysis-overlay");o&&o.remove();const s=document.createElement("div");s.id="pq-analysis-overlay",s.innerHTML=`
            <div class="pq-analysis-content">
                <div class="pq-analysis-icon">
                    <div class="pq-scan-ring"></div>
                    <i class="fa-solid fa-camera-retro"></i>
                </div>
                <h3>מנתח את התמונות שלך</h3>
                <p class="pq-analysis-subtitle">בודק איכות, חדות, וזיהוי פנים</p>
                <div class="pq-progress-bar">
                    <div class="pq-progress-fill" id="pq-progress-fill"></div>
                </div>
                <div class="pq-progress-text" id="pq-progress-text">0 / ${e} תמונות</div>
                <button class="pq-skip-btn" id="pq-skip-analysis">
                    <i class="fa-solid fa-forward"></i> דלג על הניתוח
                </button>
            </div>
        `,document.body.appendChild(s);const n=s.querySelector("#pq-skip-analysis");n&&t&&n.addEventListener("click",t)}_updateAnalysisProgress(e,t){const o=document.getElementById("pq-progress-fill"),s=document.getElementById("pq-progress-text");o&&(o.style.width=`${e/t*100}%`),s&&(s.textContent=`${e} / ${t} תמונות`)}_hideAnalysisOverlay(){const e=document.getElementById("pq-analysis-overlay");e&&(e.classList.add("pq-fade-out"),setTimeout(()=>e.remove(),400))}_showReviewModal(e,t,o){const{recommended:s,notRecommended:n,duplicates:r,analyses:i}=e,a=document.createElement("div");a.id="pq-review-modal",a.className="pq-modal";const l=t.length,c=s.length,d=n.length,p=(r||[]).length;a.innerHTML=`
            <div class="pq-modal-content">
                <button class="pq-close-btn" id="pq-close-btn">
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <div class="pq-header">
                    <div class="pq-header-icon">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    <h2>סיכום ניתוח תמונות</h2>
                    <p>נותחו <strong>${l}</strong> תמונות</p>
                </div>

                <!-- Stats Summary -->
                <div class="pq-stats">
                    <div class="pq-stat pq-stat-good">
                        <span class="pq-stat-num">${c}</span>
                        <span class="pq-stat-label">מומלצות ✓</span>
                    </div>
                    ${p>0?`
                    <div class="pq-stat" style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.2);">
                        <span class="pq-stat-num" style="color:#fbbf24;">${p}</span>
                        <span class="pq-stat-label">כפילויות 👯</span>
                    </div>`:""}
                    <div class="pq-stat pq-stat-bad">
                        <span class="pq-stat-num">${d}</span>
                        <span class="pq-stat-label">לא מומלצות</span>
                    </div>
                </div>

                <!-- Recommended Section (Expanded by Default) -->
                ${c>0?`
                <div class="pq-section pq-section-good">
                    <div class="pq-section-header" id="pq-toggle-good" style="cursor: pointer;">
                        <h3><i class="fa-solid fa-check-circle"></i> תמונות מומלצות (${c})</h3>
                        <i class="fa-solid fa-chevron-up pq-toggle-icon pq-rotated"></i>
                    </div>
                    <div class="pq-photo-grid" id="pq-good-grid">
                        ${s.map(w=>this._renderPhotoCard(w,!0,"good")).join("")}
                    </div>
                </div>
                `:""}

                <!-- Not Recommended Section -->
                ${d>0?`
                <div class="pq-section">
                    <div class="pq-section-header">
                        <h3><i class="fa-solid fa-triangle-exclamation"></i> תמונות שלא מומלץ להעלות</h3>
                        <label class="pq-check-all">
                            <input type="checkbox" id="pq-keep-all-bad">
                            <span>העלה הכל בכל זאת</span>
                        </label>
                    </div>
                    <div class="pq-photo-grid" id="pq-bad-grid">
                        ${n.map(w=>this._renderPhotoCard(w,!1,"bad")).join("")}
                    </div>
                </div>
                `:""}

                <!-- Duplicates Section -->
                ${p>0?`
                <div class="pq-section">
                    <div class="pq-section-header">
                        <h3><i class="fa-solid fa-clone" style="color:#fbbf24;"></i> כפילויות שזוהו (הטובה ביותר כבר נבחרה)</h3>
                        <label class="pq-check-all">
                            <input type="checkbox" id="pq-keep-all-dup">
                            <span>העלה הכל בכל זאת</span>
                        </label>
                    </div>
                    <div class="pq-photo-grid" id="pq-dup-grid">
                        ${r.map(w=>this._renderPhotoCard(w,!1,"dup")).join("")}
                    </div>
                </div>
                `:""}

                <!-- Action Footer -->
                <div class="pq-footer">
                    <div class="pq-footer-summary">
                        <i class="fa-solid fa-images"></i>
                        <span id="pq-final-count">${c}</span> תמונות ייכנסו לאלבום
                    </div>
                    <div class="pq-footer-actions">
                        <button class="pq-btn pq-btn-secondary" id="pq-btn-cancel">ביטול</button>
                        <button class="pq-btn pq-btn-primary" id="pq-btn-confirm">
                            <i class="fa-solid fa-check"></i> אישור והמשך
                        </button>
                    </div>
                </div>
            </div>
        `,document.body.appendChild(a),a.querySelector("#pq-close-btn").addEventListener("click",()=>{a.remove(),t.forEach(w=>{const b=i.get(w.id);b&&(w.visionFocalPoint={focalX:b.focalX,focalY:b.focalY},w._visionAnalysis=b)}),o(t,i)});const u=a.querySelector("#pq-toggle-good"),g=a.querySelector("#pq-good-grid");u&&g&&u.addEventListener("click",()=>{g.classList.toggle("pq-collapsed");const w=u.querySelector(".pq-toggle-icon");w&&w.classList.toggle("pq-rotated")}),a.querySelectorAll(".pq-photo-thumb").forEach(w=>{w.addEventListener("click",b=>{if(b.target.closest(".pq-score-badge, .pq-face-badge, .pq-head-cut-badge"))return;const v=w.querySelector("img");v&&this._showImagePreview(v.src)})});const m=a.querySelector("#pq-keep-all-bad");m&&m.addEventListener("change",()=>{a.querySelectorAll('#pq-bad-grid input[type="checkbox"]').forEach(b=>{b.checked=m.checked}),this._updateFinalCount(a,c)});const y=a.querySelector("#pq-keep-all-dup");y&&y.addEventListener("change",()=>{a.querySelectorAll('#pq-dup-grid input[type="checkbox"]').forEach(b=>{b.checked=y.checked}),this._updateFinalCount(a,c)}),a.querySelectorAll(".pq-keep-checkbox").forEach(w=>{w.addEventListener("change",()=>{this._updateFinalCount(a,c)})}),a.querySelector("#pq-btn-cancel").addEventListener("click",()=>{a.remove(),t.forEach(w=>{const b=i.get(w.id);b&&(w.visionFocalPoint={focalX:b.focalX,focalY:b.focalY},w._visionAnalysis=b)}),o(t,i)}),a.querySelector("#pq-btn-confirm").addEventListener("click",()=>{const w=Array.from(a.querySelectorAll('#pq-bad-grid input[type="checkbox"]:checked')).map(C=>C.dataset.photoId),b=Array.from(a.querySelectorAll('#pq-dup-grid input[type="checkbox"]:checked')).map(C=>C.dataset.photoId),v=s.map(C=>C.id),S=new Set([...v,...w,...b]),f=t.filter(C=>S.has(C.id));f.forEach(C=>{const I=i.get(C.id);I&&(C.visionFocalPoint={focalX:I.focalX,focalY:I.focalY},C._visionAnalysis=I)}),t.filter(C=>!S.has(C.id)).forEach(C=>{const I=i.get(C.id);I&&(C.visionFocalPoint={focalX:I.focalX,focalY:I.focalY},C._visionAnalysis=I,C._excluded=!0)}),a.remove(),o(f,i)}),a.addEventListener("click",w=>{w.target===a&&a.querySelector("#pq-close-btn").click()})}_showImagePreview(e){const t=document.createElement("div");t.style.position="fixed",t.style.inset="0",t.style.backgroundColor="rgba(0,0,0,0.9)",t.style.zIndex="100020",t.style.display="flex",t.style.alignItems="center",t.style.justifyContent="center",t.style.cursor="pointer",t.style.opacity="0",t.style.transition="opacity 0.2s ease";const o=document.createElement("img");if(e.startsWith("data:")){t.remove();return}let s=e;s.includes("googleusercontent.com")&&s.includes("=")&&(s=s.replace(/=w\d+-h\d+/g,"=w2048-h2048")),o.src=s,o.style.maxWidth="90%",o.style.maxHeight="90%",o.style.objectFit="contain",o.style.borderRadius="8px",o.style.boxShadow="0 10px 30px rgba(0,0,0,0.5)",o.style.transform="scale(0.95)",o.style.transition="transform 0.2s ease",t.appendChild(o),t.addEventListener("click",()=>{t.style.opacity="0",o.style.transform="scale(0.95)",setTimeout(()=>t.remove(),200)}),document.body.appendChild(t),requestAnimationFrame(()=>{t.style.opacity="1",o.style.transform="scale(1)"})}_renderPhotoCard(e,t,o="good"){const s=e._analysis||{},n=pe.getQualityTier(s.qualityScore||70),r=(s.issues||[]).map(v=>pe.getIssueLabel(v)).join("، "),i=s.description_he||"",a=s.reason_he||s.reason_en||"",l=e.thumbnailUrl||e.url||"",c=s.headCutOff??!1,d=s.duplicateGroupId?`<div style="font-size:10px;color:#fbbf24;margin-bottom:3px;">👯 קבוצה: ${s.duplicateGroupId} ${s.isBestInGroup?"★ הטובה ביותר":""}</div>`:"",p=o==="dup"?"rgba(251,191,36,0.3)":o==="bad"?"rgba(239,68,68,0.2)":"rgba(255,255,255,0.06)",u=s.focalX??50,g=s.faces||[];let m;s.headTop!==null&&s.headTop!==void 0&&g.length>0?m=Math.max(0,Math.min(60,s.headTop)):m=s.focalY??35;const y=`${u}% ${m}%`,w=this._getPhotoDate(e,s),b=w?`<div class="pq-date-badge"><i class="fa-regular fa-calendar"></i> ${w}</div>`:"";return`
            <div class="pq-photo-card" style="border-color:${p};">
                <div class="pq-photo-thumb">
                    <img src="${l}" alt="Photo" loading="lazy" 
                        style="object-position: ${y};"
                        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2230%22>📷</text></svg>'">
                    <div class="pq-score-badge" style="background: ${n.color}">
                        ${n.icon} ${s.qualityScore||70}
                    </div>
                    ${b}
                    ${s.hasPeople?'<div class="pq-face-badge"><i class="fa-solid fa-face-smile"></i></div>':""}
                    ${c?'<div class="pq-head-cut-badge"><i class="fa-solid fa-scissors"></i> ראש חתוך</div>':""}
                </div>
                <div class="pq-photo-info">
                    ${d}
                    ${i?`<div class="pq-reason" style="color:#cbd5e1;font-weight:500;">${i}</div>`:""}
                    ${!t&&r?`<div class="pq-issues">${r}</div>`:""}
                    ${a&&a!==i?`<div class="pq-reason">${a}</div>`:""}
                    ${t?"":`
                        <label class="pq-keep-label">
                            <input type="checkbox" class="pq-keep-checkbox" data-photo-id="${e.id}">
                            <span>להעלות בכל זאת</span>
                        </label>
                    `}
                </div>
            </div>
        `}_updateFinalCount(e,t){const o=e.querySelectorAll('#pq-bad-grid input[type="checkbox"]:checked').length,s=e.querySelectorAll('#pq-dup-grid input[type="checkbox"]:checked').length,n=e.querySelector("#pq-final-count");n&&(n.textContent=t+o+s)}_getPhotoDate(e,t){try{if(t.exifDate)return t.exifDate;if(e.mediaMetadata?.creationTime)return this._formatDate(new Date(e.mediaMetadata.creationTime));if(e.creationTime)return this._formatDate(new Date(e.creationTime));if(e.file?.lastModified)return this._formatDate(new Date(e.file.lastModified));const s=(e.name||e.filename||"").match(/(\d{4})[\-_]?(\d{2})[\-_]?(\d{2})/);if(s){const n=new Date(s[1],s[2]-1,s[3]);if(!isNaN(n.getTime()))return this._formatDate(n)}return null}catch{return null}}_formatDate(e){if(!e||isNaN(e.getTime()))return null;const t=e.getDate(),s=["ינו","פבר","מרץ","אפר","מאי","יונ","יול","אוג","ספט","אוק","נוב","דצמ"][e.getMonth()],n=e.getFullYear(),r=new Date().getFullYear();return n===r?`${t} ${s}`:`${t} ${s} ${n}`}injectStyles(){if(document.querySelector("#pq-styles"))return;const e=document.createElement("style");e.id="pq-styles",e.textContent=`
            /* ============= Analysis Overlay ============= */
            #pq-analysis-overlay {
                position: fixed;
                inset: 0;
                background: rgba(10, 10, 18, 0.92);
                backdrop-filter: blur(12px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100010;
                animation: pq-fadeIn 0.3s ease;
            }
            #pq-analysis-overlay.pq-fade-out {
                opacity: 0;
                transition: opacity 0.4s ease;
            }
            @keyframes pq-fadeIn { from { opacity: 0; } to { opacity: 1; } }

            .pq-analysis-content {
                text-align: center;
                color: white;
                font-family: 'Rubik', 'Heebo', sans-serif;
            }
            .pq-analysis-content h3 {
                font-size: 1.6rem;
                margin: 20px 0 8px;
                background: linear-gradient(90deg, #fff, #a78bfa);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .pq-analysis-subtitle {
                color: #94a3b8;
                font-size: 0.95rem;
                margin-bottom: 30px;
            }
            .pq-analysis-icon {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 100px;
                height: 100px;
                font-size: 40px;
                color: #a78bfa;
            }
            .pq-scan-ring {
                position: absolute;
                inset: 0;
                border: 3px solid transparent;
                border-top-color: #a78bfa;
                border-right-color: #ec4899;
                border-radius: 50%;
                animation: pq-spin 1.2s linear infinite;
            }
            @keyframes pq-spin { to { transform: rotate(360deg); } }

            .pq-progress-bar {
                width: 280px;
                height: 6px;
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
                margin: 0 auto;
                overflow: hidden;
            }
            .pq-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #a78bfa, #ec4899);
                border-radius: 3px;
                transition: width 0.5s ease;
                width: 0%;
            }
            .pq-progress-text {
                color: #64748b;
                font-size: 0.85rem;
                margin-top: 12px;
            }
            .pq-skip-btn {
                margin-top: 24px;
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.12);
                color: #94a3b8;
                padding: 10px 28px;
                border-radius: 10px;
                cursor: pointer;
                font-size: 0.9rem;
                font-family: 'Rubik', 'Heebo', sans-serif;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s ease;
            }
            .pq-skip-btn:hover {
                background: rgba(255,255,255,0.1);
                color: #e2e8f0;
                border-color: rgba(139, 92, 246, 0.3);
            }

            /* ============= Review Modal ============= */
            .pq-modal {
                position: fixed;
                inset: 0;
                background: rgba(10, 10, 18, 0.88);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100010;
                animation: pq-fadeIn 0.3s ease;
                font-family: 'Rubik', 'Heebo', sans-serif;
                direction: rtl;
            }
            .pq-modal-content {
                background: linear-gradient(135deg, #13131f 0%, #1a1a2e 100%);
                border-radius: 20px;
                width: 90%;
                max-width: 780px;
                max-height: 85vh;
                overflow-y: auto;
                color: #fff;
                box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139, 92, 246, 0.15);
                border: 1px solid rgba(139, 92, 246, 0.2);
                position: relative;
            }
            .pq-close-btn {
                position: absolute;
                top: 16px;
                left: 16px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                color: #94a3b8;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                z-index: 2;
            }
            .pq-close-btn:hover {
                background: rgba(255,255,255,0.1);
                color: white;
            }

            /* Header */
            .pq-header {
                padding: 30px 30px 20px;
                text-align: center;
            }
            .pq-header-icon {
                display: inline-flex;
                width: 56px;
                height: 56px;
                align-items: center;
                justify-content: center;
                border-radius: 16px;
                background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2));
                font-size: 24px;
                color: #a78bfa;
                margin-bottom: 14px;
            }
            .pq-header h2 {
                font-size: 1.5rem;
                font-weight: 700;
                margin: 0 0 8px;
            }
            .pq-header p {
                color: #94a3b8;
                font-size: 0.95rem;
                margin: 0;
                line-height: 1.5;
            }

            /* Stats */
            .pq-stats {
                display: flex;
                gap: 16px;
                padding: 0 30px 20px;
                justify-content: center;
            }
            .pq-stat {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 14px 30px;
                border-radius: 14px;
                min-width: 120px;
            }
            .pq-stat-good {
                background: rgba(34, 197, 94, 0.1);
                border: 1px solid rgba(34, 197, 94, 0.2);
            }
            .pq-stat-bad {
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.2);
            }
            .pq-stat-num {
                font-size: 1.8rem;
                font-weight: 800;
            }
            .pq-stat-good .pq-stat-num { color: #22c55e; }
            .pq-stat-bad .pq-stat-num { color: #ef4444; }
            .pq-stat-label {
                font-size: 0.8rem;
                color: #94a3b8;
                margin-top: 4px;
            }

            /* Sections */
            .pq-section {
                padding: 0 24px 20px;
            }
            .pq-section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 6px;
                margin-bottom: 10px;
            }
            .pq-section-header h3 {
                font-size: 1rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 0;
            }
            .pq-section-header h3 i {
                color: #f59e0b;
            }
            .pq-section-good .pq-section-header h3 i {
                color: #22c55e;
            }
            .pq-toggle-icon {
                transition: transform 0.3s ease;
                color: #64748b;
            }
            .pq-toggle-icon.pq-rotated {
                transform: rotate(180deg);
            }
            .pq-check-all {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.85rem;
                color: #94a3b8;
                cursor: pointer;
            }
            .pq-check-all input {
                accent-color: #a78bfa;
                width: 16px;
                height: 16px;
            }

            /* Photo Grid */
            .pq-photo-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 12px;
                max-height: 400px;
                overflow-y: auto;
                transition: max-height 0.3s ease, opacity 0.3s ease;
            }
            .pq-photo-grid.pq-collapsed {
                max-height: 0;
                overflow: hidden;
                opacity: 0;
            }

            /* Photo Card */
            .pq-photo-card {
                background: rgba(255,255,255,0.04);
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,0.06);
                transition: transform 0.3s ease, border-color 0.2s, box-shadow 0.3s ease;
                cursor: pointer;
            }
            .pq-photo-card:hover {
                animation: pq-wobble 0.5s ease;
                border-color: rgba(139, 92, 246, 0.35);
                box-shadow: 0 8px 25px rgba(139, 92, 246, 0.15);
            }
            @keyframes pq-wobble {
                0%   { transform: rotate(0deg) scale(1); }
                15%  { transform: rotate(-2deg) scale(1.03); }
                30%  { transform: rotate(2.5deg) scale(1.04); }
                45%  { transform: rotate(-1.5deg) scale(1.03); }
                60%  { transform: rotate(1deg) scale(1.02); }
                75%  { transform: rotate(-0.5deg) scale(1.01); }
                100% { transform: rotate(0deg) scale(1); }
            }
            .pq-card-bad {
                border-color: rgba(239, 68, 68, 0.2);
            }
            .pq-photo-thumb {
                position: relative;
                height: 110px;
                background: #111;
            }
            .pq-photo-thumb img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .pq-score-badge {
                position: absolute;
                top: 6px;
                right: 6px;
                padding: 3px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                color: white;
                letter-spacing: 0.3px;
            }
            .pq-face-badge {
                position: absolute;
                bottom: 6px;
                left: 6px;
                background: rgba(0,0,0,0.6);
                color: #fbbf24;
                padding: 3px 6px;
                border-radius: 5px;
                font-size: 12px;
            }
            .pq-head-cut-badge {
                position: absolute;
                top: 6px;
                left: 6px;
                background: rgba(239, 68, 68, 0.85);
                color: white;
                padding: 3px 7px;
                border-radius: 5px;
                font-size: 10px;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .pq-date-badge {
                position: absolute;
                bottom: 6px;
                right: 6px;
                background: rgba(0,0,0,0.7);
                backdrop-filter: blur(4px);
                color: #e2e8f0;
                padding: 2px 7px;
                border-radius: 5px;
                font-size: 10px;
                font-family: 'Inter', 'Rubik', sans-serif;
                display: flex;
                align-items: center;
                gap: 4px;
                letter-spacing: 0.3px;
                direction: ltr;
            }
            .pq-date-badge i {
                font-size: 9px;
                color: #94a3b8;
            }
            .pq-photo-info {
                padding: 8px 10px;
            }
            .pq-issues {
                font-size: 11px;
                color: #f59e0b;
                margin-bottom: 4px;
                line-height: 1.4;
            }
            .pq-reason {
                font-size: 11px;
                color: #64748b;
                margin-bottom: 6px;
                line-height: 1.3;
            }
            .pq-keep-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                color: #94a3b8;
                cursor: pointer;
            }
            .pq-keep-label input {
                accent-color: #a78bfa;
                width: 15px;
                height: 15px;
            }

            /* Footer */
            .pq-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 18px 24px;
                border-top: 1px solid rgba(255,255,255,0.06);
                background: rgba(0,0,0,0.2);
                border-radius: 0 0 20px 20px;
            }
            .pq-footer-summary {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.95rem;
                color: #94a3b8;
            }
            .pq-footer-summary i {
                color: #a78bfa;
            }
            #pq-final-count {
                color: white;
                font-weight: 700;
            }
            .pq-footer-actions {
                display: flex;
                gap: 10px;
            }
            .pq-btn {
                padding: 10px 22px;
                border-radius: 10px;
                border: none;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                font-family: inherit;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .pq-btn-secondary {
                background: rgba(255,255,255,0.08);
                color: #94a3b8;
            }
            .pq-btn-secondary:hover {
                background: rgba(255,255,255,0.12);
                color: white;
            }
            .pq-btn-primary {
                background: linear-gradient(135deg, #8b5cf6, #ec4899);
                color: white;
            }
            .pq-btn-primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
            }

            /* ============= Mobile ============= */
            @media (max-width: 600px) {
                .pq-modal-content {
                    width: 95%;
                    max-height: 90vh;
                }
                .pq-photo-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                .pq-stats {
                    gap: 10px;
                }
                .pq-stat {
                    padding: 10px 16px;
                    min-width: 90px;
                }
                .pq-footer {
                    flex-direction: column;
                    gap: 12px;
                }
            }
        `,document.head.appendChild(e)}}const we=new Dt;window.pdfExport=de;window.pdfCanvasExport=se;class Rt{constructor(){this.boundHandleCropDragStart=this.handleCropDragStart.bind(this),this.boundHandleCropDragMove=this.handleCropDragMove.bind(this),this.boundHandleCropDragEnd=this.handleCropDragEnd.bind(this),this.enterCropMode=this.enterCropMode.bind(this),this.commitCropMode=this.commitCropMode.bind(this),this.init(),this.initConfig().then(()=>{})}async initConfig(){if(window.CONFIG&&window.CONFIG.GEMINI_API_KEY){console.log("[App] Initializing Gemini with Key from window.CONFIG"),ie.init(window.CONFIG.GEMINI_API_KEY);return}const e=localStorage.getItem("gemini_api_key");if(e){console.log("[App] Initializing Gemini with Key from LocalStorage"),ie.init(e);return}console.warn("[App] Gemini API Key missing. Magic features will run in Mock Mode.")}init(){this.renderer=new Ce("canvas-container"),this.state=h.state,this.moveableInstance=null,this.clipboard=null,this.bindEvents(),this.setupKeyboardShortcuts(),this.createHoverTooltip(),this.loadAssets(),this.profileModal=new Et(this),this.projectManager=new _t(this),this.saveDebounced=U.debounce(o=>{if(!(o.pages&&o.pages.length>0||o.assets&&o.assets.photos&&o.assets.photos.length>0)){console.log("[App] Auto-save skipped: State is empty.");return}if(U.currentRole==="viewer"){console.log("[App] Auto-save skipped: User is a restricted viewer.");return}U.saveProject(h.state.user?.uid||null,o)},3e3);const e=new URLSearchParams(window.location.search);this.isAutoStart=e.get("autoStart")==="true",this.targetTemplateId=e.get("templateId"),this.urlProjectId=e.get("projectId"),this.urlShareToken=e.get("shareToken"),this.waProjectId=e.get("project"),this.waSource=e.get("source");const t=document.getElementById("auto-start-upload-modal");if(t){const o=document.getElementById("btn-auto-upload-local"),s=document.getElementById("btn-auto-upload-google");o&&(o.onclick=()=>{const n=document.getElementById("file-upload-input");n&&n.click(),t.style.display="none"}),s&&(s.onclick=async()=>{if(this.magicCreateGenerationStarted=!0,!h.state.user)try{console.log("Login required for Google Photos..."),await G.signInWithGoogle()}catch(n){this.magicCreateGenerationStarted=!1,console.error("Login failed",n),alert("ההתחברות נכשלה. אנא נסה שוב.");return}try{const n=await be.openPicker();n&&n.length>0?(t.style.display="none",we.review(n,(r,i)=>{if(h.state.assets.photos=r,h.notify("assets",h.state.assets),this.renderAssetSidebar&&this.renderAssetSidebar(),this.isAutoStart&&this.templateSidebar){const a=this.targetTemplateId||"family-roots-v1";console.log(`[App] Auto-Start: Generating book from Google Photos using ${a}...`),this.templateSidebar.handleTemplateSelect(a).then(()=>{this.disabledAutoStart=!0,this.isAutoStart=!1})}})):(this.magicCreateGenerationStarted=!1,console.log("[App] Google Photos Picker cancelled or empty."),alert("לא נבחרו תמונות. אנא בחר תמונות או העלה מהמחשב כדי להמשיך ביצירת הספר."),t.style.display="flex")}catch(n){this.magicCreateGenerationStarted=!1,console.error("Google Photos Error:",n);const r=n.message||"Unknown error";!r.includes("popup_b_closed")&&!r.includes("cancel")&&alert("טעינת תמונות מ-Google נכשלה. אנא נסה שוב או העלה מהמחשב."),t.style.display="flex"}})}G.onAuthStateChanged(async o=>{if(h.state.user=o,this.renderAuthUI(),this.waProjectId&&this.waSource==="whatsapp"&&!this._waLoaded){console.log("[App] Loading WhatsApp project:",this.waProjectId);try{const s=G.getDB();let n=await s.collection("whatsapp_projects").doc(this.waProjectId).get();if(n.exists||(console.log("[App] WhatsApp project not found on first try, retrying in 2s..."),await new Promise(r=>setTimeout(r,2e3)),n=await s.collection("whatsapp_projects").doc(this.waProjectId).get()),this._waLoaded=!0,n.exists){const r=n.data(),i=r.plan;console.log("[App] WhatsApp project loaded:",r.title,r.photos?.length,"photos",i?.pages?.length,"pages");const a=(r.photos||[]).map((x,C)=>({id:x.id||`wa_${C}`,url:x.url,rawBaseUrl:x.url,baseUrl:x.url,name:x.name||`photo_${C}.jpg`,index:x.index??C,type:"photo"}));h.state.assets={photos:a},h.notify("assets",h.state.assets),this.renderAssetSidebar&&this.renderAssetSidebar();let l=i.cover?{id:"page_cover_"+crypto.randomUUID(),templateId:"cover",title:i.cover.title||r.title,subtitle:i.cover.subtitle||"",background:i.cover.backgroundTextureId||null,frontPhotoId:a[i.cover.photoIndex||0]?.id,photos:i.cover.photoIndex!==void 0?[a[i.cover.photoIndex]]:[],photoShape:i.cover.photoShape||"rounded",textContent:{title:i.cover.title||r.title,subtitle:i.cover.subtitle||""}}:null;if(l&&window.COVER_GALLERY&&window.COVER_GALLERY.length>0){const x=[r.title||"",r.prompt||"",i.cover?.title||"",i.cover?.subtitle||""].join(" ").toLowerCase();let C=null;for(const I of window.COVER_GALLERY)if(I.keywords.some(E=>x.includes(E.toLowerCase()))){C=I;break}if(C){const I="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(C.svg),E=l.frontPhotoId;l={...l,title:C.cityEn,subtitle:new Date().getFullYear().toString(),textColor:C.textColor,color:C.bgColor,theme:I,background:I,_coverGalleryId:C.id,_backSvgDataUri:C.backSvg?"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(C.backSvg):void 0,frontPhotoId:null,textContent:{title:C.cityEn,subtitle:new Date().getFullYear().toString(),date:new Date().getFullYear().toString()}},E&&!l.backPhotoId&&(l.backPhotoId=E),console.log("[App] 🌍 Travel cover auto-matched (WhatsApp):",C.id,C.cityEn)}}const c=i.backCover?{id:"page_backcover_"+crypto.randomUUID(),templateId:"back-cover",title:i.backCover.text||"",subtitle:i.backCover.subtitle||"",background:i.backCover.backgroundTextureId||null,textContent:{title:i.backCover.text||"",subtitle:i.backCover.subtitle||""}}:null,d=(i.pages||[]).map((x,C)=>{const I=[],E=(x.slots||[]).filter(k=>k.type==="photo"),T=[];return E.forEach(k=>{const L=a[k.photoIndex];L&&(I.push(L),T.push(L.id))}),{id:crypto.randomUUID(),layout:x.layout||"single",photos:I,_slotPhotoIds:T,background:x.backgroundTextureId||null,backgroundTextureId:x.backgroundTextureId||null,photoSpacing:x.photoSpacing||14,pageFrameId:x.pageFrameId||null,elementCategories:x.elementCategories||[],fontId:x.fontId||"heebo",imageShape:"rounded",slots:x.slots||[],elements:[],textContent:{}}}),p={pages:[...l?[l]:[],...d,...c?[c]:[]],cover:i.cover?{title:i.cover.title,subtitle:i.cover.subtitle,backgroundTextureId:i.cover.backgroundTextureId}:null,backCover:i.backCover||null,theme:{coverId:i.cover?.backgroundTextureId}},u={single:[{x:10,y:10,width:80,height:80}],"two-vertical":[{x:10,y:5,width:80,height:43},{x:10,y:52,width:80,height:43}],"two-horizontal":[{x:5,y:15,width:43,height:70},{x:52,y:15,width:43,height:70}],"three-left":[{x:5,y:5,width:55,height:90},{x:63,y:5,width:32,height:43},{x:63,y:52,width:32,height:43}],"three-right":[{x:10,y:5,width:80,height:50},{x:10,y:58,width:38,height:37},{x:52,y:58,width:38,height:37}],"four-grid":[{x:5,y:5,width:43,height:43},{x:52,y:5,width:43,height:43},{x:5,y:52,width:43,height:43},{x:52,y:52,width:43,height:43}],"collage-5":[{x:5,y:5,width:43,height:43},{x:52,y:5,width:43,height:43},{x:5,y:52,width:43,height:43},{x:52,y:52,width:20,height:20},{x:75,y:52,width:20,height:20}],"collage-6":[{x:5,y:5,width:30,height:40},{x:38,y:5,width:24,height:40},{x:65,y:5,width:30,height:40},{x:5,y:50,width:30,height:40},{x:38,y:50,width:24,height:40},{x:65,y:50,width:30,height:40}]};p.pages.forEach(x=>{if(typeof x.layout=="string"){const C=x.layout,I=u[C]||u.single,E=x._slotPhotoIds||[];x.layout={id:C,slots:I.map((T,k)=>({...T,photoId:E[k]||null}))},console.log(`[App] Layout "${C}" → ${x.layout.slots.length} slots, photoIds:`,E)}}),console.log("[App] WhatsApp: Layout conversion done");const g=p.pages||[],m=g.find(x=>x.templateId==="cover"||x.id&&x.id.startsWith("page_cover_")),y=g.find(x=>x.templateId==="back-cover"||x.id&&x.id.startsWith("page_backcover_")),w=g.filter(x=>x!==m&&x!==y);w.forEach(x=>{x.id||(x.id=crypto.randomUUID())});const b=new Set;w.forEach(x=>{(x.layout?.slots||[]).forEach(C=>{C.photoId&&b.add(C.photoId)})}),console.log("[App] WhatsApp SLOT FILL: assigned IDs:",b.size,"total photos:",a.length),w.forEach((x,C)=>{const I=x.layout?.slots||[],E=I.filter(k=>!k.photoId).length,T=I.filter(k=>!!k.photoId).length;console.log(`[App] WhatsApp BEFORE fill - Page ${C}: layout=${x.layout?.id} slots=${I.length} filled=${T} empty=${E}`)});const v=a.filter(x=>!b.has(x.id));console.log("[App] WhatsApp SLOT FILL: unassigned photos:",v.length);let S=0,f=0;if(w.forEach((x,C)=>{(x.layout?.slots||[]).forEach((E,T)=>{if(!E.photoId){let k;S<v.length?k=v[S++]:(k=a[S%a.length],S++),k&&(E.photoId=k.id,x.photos||(x.photos=[]),x.photos.push(k),f++,console.log(`[App] WhatsApp FILLED: Page ${C} slot ${T} → ${k.id}`))}})}),console.log("[App] WhatsApp: Filled",f,"empty slots. Pages:",w.length,"Photos:",a.length),this.magicCreateGenerationStarted=!0,window.store._isBatchUpdating=!0,window.store.state.assets={photos:a},window.store.state.pages=w,window.store.state.activePageId=w[0]?.id,window.store.state.viewMode="pages",m&&(m._coverGalleryId?(window.store.state.cover={...window.store.state.cover||{},...m},console.log("[App] 🌍 Country cover applied to store:",m._coverGalleryId)):window.store.state.cover={...window.store.state.cover||{},...m,background:m.background||m.backgroundTextureId,theme:m.background||m.backgroundTextureId}),p.theme&&(window.store.state.theme=p.theme),window._magicPages=w,window._magicCover={...window.store.state.cover},window._magicAssets={photos:[...a]},window.store._isBatchUpdating=!1,this.renderer&&w[0]){const x=document.getElementById("canvas-container");x&&(console.log("[App] WhatsApp: Rendering page 0 to canvas. Assets:",a.length),this.renderer.renderPageToContainer(w[0],{photos:a},x,null))}this.updateTimeline&&this.updateTimeline(w,w[0]?.id),window.store.notify("pages",w),this._magicCreateRendering=!1,this.saveDebounced&&this.saveDebounced(window.store.state),setTimeout(()=>{window.store.state.assets?.photos?.length||(window.store.state.assets={photos:a}),this.renderActivePage();const x=document.getElementById("page-timeline");x&&x.querySelectorAll(".timeline-page").forEach(I=>{if(I._lazyRender&&!I._rendered)try{I._lazyRender(),I._rendered=!0}catch(E){console.warn("[App] Timeline thumb render failed:",E.message)}})},800),console.log("[App] WhatsApp album state set, rendering in 1s"),window.history.replaceState({},document.title,window.location.pathname);return}else console.error("[App] WhatsApp project not found:",this.waProjectId)}catch(s){console.error("[App] Failed to load WhatsApp project:",s)}setTimeout(()=>{const s=window.store?.state?.pages||[],n=window.store?.state?.assets?.photos||[];if(s.length>0&&n.length>0){let r=0;s.forEach(i=>{(i.layout?.slots||[]).forEach(a=>{!a.photoId&&n.length>0&&(a.photoId=n[r%n.length].id,i.photos||(i.photos=[]),i.photos.push(n[r%n.length]),r++)})}),r>0&&(console.log("[App] POST-RESTORE: Filled",r,"empty slots from cached data"),this.renderActivePage(),this.updateTimeline&&(this._lastTimelineHash=null,this.updateTimeline(s,window.store.state.activePageId)))}},3e3)}if(this.magicCreateGenerationStarted){console.log("[App] Auth observer skipped: Magic Create sequence already claimed session.");return}{console.log("Auth State Changed, checking for projects. Logged in:",!!o);const s=document.getElementById("restore-loading-modal"),n=document.getElementById("auto-start-upload-modal");let r=null;if(this.urlProjectId){if(!o){alert("אנא התחבר כדי לצפות או לערוך אלבום זה.");try{await G.signInWithGoogle();return}catch(i){console.error("Login required for shared album",i),window.location.search=""}}if(this.urlShareToken&&o)try{await U.joinProject(this.urlProjectId,this.urlShareToken)}catch(i){console.error("Failed to join project via share token:",i),alert("קישור השיתוף אינו חוקי או פג תוקף.")}s&&(s.style.display="flex");try{r=await U.loadProject(o?.uid||null,this.urlProjectId)}catch(i){console.error("[App] Failed to load shared project (IndexedDB/network error):",i),r=null}window.history.replaceState({},document.title,window.location.pathname)}else try{r=await U.loadProject(o?.uid||null)}catch(i){console.error("[App] Failed to load project from IndexedDB:",i),console.warn("[App] Starting fresh due to storage error. Your project data may be too large for this browser."),r=null}if(r&&(console.log("Loading saved project..."),r.pages&&r.pages.length>0||r.cover||(console.warn("[App] Loaded project appears empty or corrupt. Ignoring and starting fresh."),r=null)),r&&(console.log("Valid saved project found. Restoring..."),(r.pages&&r.pages.some(a=>a.templateId==="family-roots-v1")||r.cover&&(r.cover.title==="The Smith Family"||r.cover.subtitle==="Roots & Memories"))&&(console.log("[App] Detected legacy default 'Smith Family' template in save. DISCARDING for clean slate."),r=null)),this.isAutoStart&&!this.disabledAutoStart&&(console.log("[App] Auto-Start detected. Ignoring saved project to enforce fresh session."),r=null,U.currentProjectId=null),r){s&&(s.style.display="flex");const i=[...h.state.assets?.photos||[]];if(r.assets&&r.assets.photos){const l=r.assets.photos.filter(d=>{const p=d.url||d.baseUrl||d.rawBaseUrl;return p&&!p.startsWith("blob:")});l.forEach(d=>{!d.url&&d.baseUrl?(d.url=d.baseUrl,d.rawBaseUrl=d.baseUrl):!d.url&&d.rawBaseUrl&&(d.url=d.rawBaseUrl)});const c=[...l];for(const d of i)c.find(p=>p.id===d.id)||c.push(d);console.log(`[App] Hydrating ${l.length} saved photos, adding ${i.length} active session photos.`),r.assets.photos=c}else r.assets={photos:i};if(this.magicCreateGenerationStarted){console.log("[App] Auth restore ABORTED: Magic Create completed while loading saved project."),s&&(s.style.display="none");return}r.pages&&Array.isArray(r.pages)&&r.pages.forEach(l=>{l.id||(l.id=crypto.randomUUID(),console.warn("[App] Auto-assigned missing page ID:",l.id))}),Object.assign(h.state,{...r,user:o,assets:r.assets||h.state.assets}),h.notify("pages",h.state.pages),h.notify("cover",h.state.cover),h.notify("assets",h.state.assets),this.renderAssetSidebar&&this.renderAssetSidebar(),this.templateSidebar=new ve("template-library",this),this.templateSidebar.init();const a=(h.state.pages&&h.state.pages[0]?h.state.pages[0].templateId:null)||(h.state.cover?h.state.cover.templateId:null);if(a&&this.templateSidebar.manager)try{await this.templateSidebar.manager.loadTemplate(a),de.setTemplateConfig(this.templateSidebar.manager.config),se.setTemplateConfig(this.templateSidebar.manager.config)}catch(l){console.error("Failed to restore template config:",l)}h.state.viewMode==="cover"?this.renderCoverWithTemplate():this.renderActivePage(),console.log(`[App] Project restored for ${o?o.displayName||"Unnamed User":"Local User"}`),s&&(s.style.display="none"),U.currentRole==="viewer"?this.applyViewerRestrictions():this.removeViewerRestrictions(),o&&U.currentProjectId&&U.startPresence(U.currentProjectId,o,l=>{const c=document.getElementById("online-users");c&&(c.innerHTML="",!(l.length<=1)&&l.forEach(d=>{if(d.uid===o.uid)return;const p=document.createElement("div");p.className="online-avatar",p.title=d.displayName+" עורך כעת",d.photoURL?p.style.backgroundImage=`url(${d.photoURL})`:p.textContent=d.displayName.charAt(0).toUpperCase(),c.appendChild(p)}))})}else s&&(s.style.display="none"),this.templateSidebar=new ve("template-library",this),this.templateSidebar.init(),this.targetTemplateId&&this.templateSidebar.manager&&(console.log(`[App] Applying target template: ${this.targetTemplateId}`),setTimeout(async()=>{try{await this.templateSidebar.manager.loadTemplate(this.targetTemplateId),de.setTemplateConfig(this.templateSidebar.manager.config),se.setTemplateConfig(this.templateSidebar.manager.config),this.renderActivePage()}catch(i){console.error("Failed to load target template:",i)}},500)),n&&(n.style.display="flex")}})}updateActiveThumbnailOnly(){if(!h.state.pages||!h.state.activePageId)return;h.state.activePageId;const e=document.querySelector(".timeline-page.active");e&&e._lazyRender&&(e._lazyRender(),e._lazyRender=null)}refreshActivePageThumbnail(){if(!h.state.activePageId||h.state.viewMode==="cover")return;const e=document.getElementById("page-timeline");if(!e)return;const t=e.querySelector(`.timeline-page[data-page-id="${h.state.activePageId}"]`);if(!t)return;Array.from(t.children).forEach(p=>{p.classList.contains("page-num")||p.remove()});const o=this.templateSidebar?.manager;let s=800,n=600;o?.config?.designSystem?.canvas&&(s=o.config.designSystem.canvas.scaledWidth||o.config.designSystem.canvas.width||s,n=o.config.designSystem.canvas.scaledHeight||o.config.designSystem.canvas.height||n);const i=window.innerWidth<=768?80:110,a=i/s,l=i/n,c=Math.max(a,l),d=h.state.pages.find(p=>p.id===h.state.activePageId);if(d)try{const p=document.createElement("div");p.className="timeline-preview-wrapper",p.style.width=`${s}px`,p.style.height=`${n}px`,p.style.position="absolute",p.style.top="50%",p.style.left="50%",p.style.transform=`translate(-50%, -50%) scale(${c})`,p.style.transformOrigin="center center",p.style.pointerEvents="none",p.style.backgroundColor="transparent";let u=!1;if(d.templateId&&o?.config?.templateId===d.templateId){const g=this.getSpecializedRenderer(d.templateId,o.config);if(g&&d.rawLayoutId){const m=o.config.pageLayouts.find(y=>y.layoutId===d.rawLayoutId);if(m){const y=g.renderPage(m,d.photos||[],d.textContent||{},d.textPositions||{});y&&(y.style.width="100%",y.style.height="100%",p.appendChild(y),u=!0)}}}u||this.renderer.renderPageToContainer(d,h.state.assets,p),t.appendChild(p),t._rendered=!0}catch(p){console.warn("[App] Thumbnail refresh error:",p.message)}}refreshCoverThumbnail(){const e=document.getElementById("page-timeline");if(!e)return;const t=e.querySelector(".timeline-page.cover");if(!t)return;const o=t.querySelector('div[style*="position: absolute"]');o&&o.remove();const s=this.templateSidebar?.manager;let n=800,r=600;s?.config?.designSystem?.canvas&&(n=s.config.designSystem.canvas.scaledWidth||s.config.designSystem.canvas.width||n,r=s.config.designSystem.canvas.scaledHeight||s.config.designSystem.canvas.height||r);const a=window.innerWidth<=768?80:110,l=a/n,c=a/r,d=Math.max(l,c),p=document.createElement("div");p.style.width=`${n}px`,p.style.height=`${r}px`,p.style.position="absolute",p.style.top="50%",p.style.left="50%",p.style.transform=`translate(-50%, -50%) scale(${d})`,p.style.transformOrigin="center center",p.style.pointerEvents="none",p.style.background="#fff";const u=s?.config||null;ee.render({cover:h.state.cover,assets:h.state.assets,templateConfig:u,container:p,interactive:!1,thumbnail:!1}),t.appendChild(p),t._rendered=!0,console.log("[App] Cover thumbnail refreshed")}renderActivePage(){let e=h.state.pages.find(t=>t.id===h.state.activePageId);if(console.log("[renderActivePage] activePageId:",h.state.activePageId?.substring(0,12),"found:",!!e,"totalPages:",h.state.pages.length),!e&&window._magicPages&&window._magicPages.length>0&&(console.log("[renderActivePage] Page not in store — restoring",window._magicPages.length,"pages from _magicPages"),h._isBatchUpdating=!0,h.state.pages=window._magicPages,h._isBatchUpdating=!1,e=h.state.pages.find(t=>t.id===h.state.activePageId),console.log("[renderActivePage] After restore: found:",!!e,"totalPages:",h.state.pages.length)),!e){console.warn("[renderActivePage] Page NOT FOUND even after restore! Page IDs:",h.state.pages.map(t=>t.id?.substring(0,12)));return}if(e.templateId){const t=this.templateSidebar?.manager;if(t&&t.config&&t.config.templateId===e.templateId){const o=new he(t.config);if(o&&e.rawLayoutId){const s=t.config.pageLayouts.find(n=>n.layoutId===e.rawLayoutId);if(s){const n=o.renderPage(s,e.photos||[],e.textContent||{},e.textPositions||{},e);e.textStyles&&Object.entries(e.textStyles).forEach(([i,a])=>{const l=n.querySelector(`[data-selectable-id="${i}"]`);if(l&&a.size){const c=a.size/100;l.style.transform&&l.style.transform!=="none"?l.style.transform+=` scale(${c})`:(l.style.transform=`scale(${c})`,l.style.transformOrigin="center center")}}),e.layout&&e.layout.slots&&e.layout.slots.forEach((i,a)=>{const l=n.querySelectorAll(".photo-slot"),c=n.querySelector(`.photo-slot[data-selectable-id="${i.photoId}"]`)||l[a];if(c){c.title="לחץ פעמיים לשינוי מיקום / זום על התמונה";const d=c.querySelector("img");if(d&&i.crop&&i.photoId){const p=i.crop.panX!==void 0?i.crop.panX:50,u=i.crop.panY!==void 0?i.crop.panY:50,g=i.crop.zoom||1;d.style.objectPosition=`${p}% ${u}%`,d.style.transform=`scale(${g})`,d.style.transformOrigin="center center"}}}),e.elements&&e.elements.forEach(i=>{if(i.id&&(i.id.startsWith("text_")||i.id.startsWith("dec_")||i.id.startsWith("container_")))return;const a=document.createElement("div");if(a.className=`page-element element-${i.type}`,a.style.position="absolute",a.style.left=`${i.x}%`,a.style.top=`${i.y}%`,i.zIndex!==void 0&&(a.style.zIndex=i.zIndex),i.transform&&(a.style.transform=i.transform),a.dataset.selectableType=i.type,a.dataset.selectableId=i.id,i.type==="text"){a.classList.add("text-element"),a.style.minWidth="200px",i.pixelWidth&&(a.style.width=i.pixelWidth),i.pixelHeight&&(a.style.height=i.pixelHeight),a.style.maxWidth=`${i.width||50}%`;const l=window.TEXT_STYLES?.find(c=>c.id===i.styleId);l&&l.style&&Object.assign(a.style,l.style),i.fontSize&&(a.style.fontSize=`${i.fontSize}px`),i.color&&(a.style.color=i.color),i.fontFamily&&(a.style.fontFamily=i.fontFamily),i.textAlign&&(a.style.textAlign=i.textAlign),a.textContent=i.content}else if(i.type==="qr"){a.classList.add("qr-element"),a.style.width=i.pixelWidth||"80px",a.style.height=i.pixelHeight||"80px",a.style.cursor="pointer",a.title=i.targetUrl||"QR Code";const l=document.createElement("img");if(l.src=i.url,l.style.width="100%",l.style.height="100%",l.style.objectFit="contain",l.style.borderRadius="6px",l.style.boxShadow="0 2px 8px rgba(0,0,0,0.15)",l.draggable=!1,a.appendChild(l),i.isVideo){const c=document.createElement("div");c.style.cssText="position:absolute;top:-6px;right:-6px;background:#ff4444;color:white;font-size:9px;padding:2px 5px;border-radius:8px;font-weight:700;z-index:10;",c.textContent="▶ וידאו",a.appendChild(c)}}else if(i.type==="element"){a.classList.add("visual-element"),a.style.width=i.pixelWidth||"100px",a.style.height=i.pixelHeight||"100px";const l=document.createElement("img");l.src=i.url,l.style.width="100%",l.style.height="100%",l.style.objectFit="contain",l.draggable=!1;let c="";i.filterHue&&(c+=`hue-rotate(${i.filterHue}deg) `),i.filterBrightness&&i.filterBrightness!==100&&(c+=`brightness(${i.filterBrightness}%) `),i.filterShadow&&(c+=`drop-shadow(2px 4px 6px ${i.filterShadowColor||"rgba(0,0,0,0.5)"}) `),c&&(l.style.filter=c.trim()),a.appendChild(l)}i.id===h.state.selection&&(a.classList.add("selected"),a.style.border="2px solid var(--color-primary, #6366f1)"),n.appendChild(a)});const r=document.getElementById("canvas-container");r.innerHTML="",n.classList.add("shoso-page"),n.dataset.pageId=e.id,r.appendChild(n),this.fixTextOverlaps(n);return}}}}this.renderer.renderPage(e,h.state.assets,h.state.selection)}fixTextOverlaps(e){if(!e)return;const t=Array.from(e.querySelectorAll(".text-element"));if(t.length<2)return;const o=e.getBoundingClientRect(),s=t.map(i=>{const a=i.getBoundingClientRect();return{el:i,top:a.top-o.top,bottom:a.bottom-o.top,left:a.left-o.left,right:a.right-o.left,height:a.height,fontSize:parseFloat(getComputedStyle(i).fontSize)}}).sort((i,a)=>i.top-a.top),n=4,r=.6;for(let i=0;i<s.length-1;i++){const a=s[i],l=s[i+1],c=a.bottom+n>l.top,d=!(a.right<l.left||a.left>l.right);if(c&&d){a.bottom+n-l.top;let p=a.fontSize;const u=a.fontSize*r;let g=!1;for(;p>u;){p-=1,a.el.style.fontSize=`${p}px`;const y=a.el.getBoundingClientRect().bottom-o.top;if(y+n<=l.top){g=!0,a.bottom=y;break}}if(!g){const m=a.el.getBoundingClientRect().bottom-o.top+n-l.top;if(m>0){const y=parseFloat(l.el.style.top)||0;if(((l.el.style.top||"").includes("%")?"%":"px")==="%"){const v=m/o.height*100;l.el.style.top=`${(y+v).toFixed(1)}%`}else l.el.style.top=`${y+m}px`;const b=l.el.getBoundingClientRect();l.top=b.top-o.top,l.bottom=b.bottom-o.top}}}}}loadMockPhotos(){console.log("[App] Loading Mock Photos...");const e=[{id:"mock1",url:"https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&q=80",ratio:1.5,type:"photo"},{id:"mock2",url:"https://images.unsplash.com/photo-1472653431158-6364773b2710?w=600&q=80",ratio:1.5,type:"photo"},{id:"mock3",url:"https://images.unsplash.com/photo-1520024146169-3240400354ae?w=600&q=80",ratio:1.5,type:"photo"},{id:"mock4",url:"https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?w=600&q=80",ratio:.75,type:"photo"},{id:"mock5",url:"https://images.unsplash.com/photo-1532467411038-f943805eb329?w=600&q=80",ratio:1,type:"photo"}];h.state.assets.photos=e,h.notify("assets",h.state.assets),this.renderAssetSidebar();const t=h.state.pages.find(o=>o.id===h.state.activePageId);t&&(!t.photos||t.photos.length===0)&&(h.pushState("Auto-Fill Mock"),this.addPhotoToPage("mock1",.2),setTimeout(()=>this.addPhotoToPage("mock2",.6),100))}async loadAssets(){this.renderAssetSidebar(),this.renderElementsLibrary(),h.addPage(),this.templateSidebar=new ve("template-library",this),this.templateSidebar.init()}renderElementsLibrary(){const e=document.getElementById("elements-library");if(!e)return;const t=window.ELEMENTS_LIBRARY||[];e.innerHTML="",t.forEach(o=>{const s=document.createElement("div");s.className="asset-item element-item",s.draggable=!0,s.title=o.title||"Element",s.style.cursor="grab",s.style.border="1px solid rgba(255,255,255,0.1)",s.style.borderRadius="8px",s.style.padding="10px",s.style.backgroundColor="rgba(0,0,0,0.2)",s.style.display="flex",s.style.alignItems="center",s.style.justifyContent="center",s.style.aspectRatio="1/1";const n=document.createElement("img");n.src=o.url,n.style.maxWidth="100%",n.style.maxHeight="100%",n.style.objectFit="contain",n.draggable=!1,s.appendChild(n),s.addEventListener("dragstart",r=>{r.dataTransfer.setData("application/json",JSON.stringify({type:"element",id:o.id,url:o.url})),s.style.opacity="0.5"}),s.addEventListener("dragend",()=>{s.style.opacity="1"}),e.appendChild(s)})}renderAlbumPages(e){let t=[],o=null;Array.isArray(e)?t=e:e&&typeof e=="object"&&(t=e.pages||[],o=e.cover||null),this._magicCreateRendering=!1,this._lastTimelineHash=null,o&&(h.state.cover=o,h.notify("cover",o)),t&&t.length>0&&(console.log(`[App] Applying template with ${t.length} pages`),h.state.viewMode="pages",h.state.pages=t,h.state.activePageId=t[0].id,h.notify("pages",h.state.pages),h.notify("activePageId",h.state.activePageId),this.templateSidebar&&this.templateSidebar.manager&&this.templateSidebar.manager.config&&(console.log("[App] Syncing PDF Template Config..."),de.setTemplateConfig(this.templateSidebar.manager.config),se.setTemplateConfig(this.templateSidebar.manager.config)),this.updateTimeline(t,t[0].id),this.renderActivePage())}renderCoverWithTemplate(){const e=h.state.cover;console.log("[renderCoverWithTemplate] cover from store:",JSON.stringify({background:e?.background,theme:e?.theme,title:e?.title,id:e?.id}));const t=h.state.assets,o=this.renderer.container,s=e?.templateId||h.state.pages&&h.state.pages[0]&&h.state.pages[0].templateId,n=this.templateSidebar?.manager;let r=null;s&&n&&n.config&&(r=n.config,e&&!e.templateId&&(e.templateId=s)),e&&e.textPositions&&(delete e.textPositions["cover-photo"],delete e.textPositions["cover-back-photo"]),ee.render({cover:e,assets:t,templateConfig:r,container:o,interactive:!0,thumbnail:!1}),this.fixTextOverlaps(o)}createHoverTooltip(){if(document.getElementById("photo-preview-tooltip"))return;const e=document.createElement("div");e.id="photo-preview-tooltip",e.style.position="fixed",e.style.zIndex="9999",e.style.pointerEvents="none",e.style.display="none",document.body.appendChild(e)}_normalizeCoverTextPosition(e){if(!e||e.dataset.selectableType!=="cover-text"||e._positionNormalized)return;const t=e.offsetParent||e.parentElement;if(!t)return;const o=t.getBoundingClientRect(),s=e.getBoundingClientRect(),n=s.left-o.left,r=s.top-o.top;e.style.position="absolute",e.style.left=`${n}px`,e.style.top=`${r}px`,e.style.transform="",e.style.margin="0",e._positionNormalized=!0,console.log(`[App] Normalized cover text "${e.dataset.selectableId}" → left:${n.toFixed(0)}px, top:${r.toFixed(0)}px`)}updateMoveable(e){if(!window.Moveable)return;const t=document.getElementById("canvas-container");if(!t)return;if(!e.selection){this.moveableInstance&&(this.moveableInstance.destroy(),this.moveableInstance=null);return}const o=document.querySelector(`[data-selectable-id="${e.selection}"]`);if(!o){this.moveableInstance&&(this.moveableInstance.destroy(),this.moveableInstance=null);return}const s=o.dataset.selectableType;if(s==="photo"||s==="empty-slot"||s==="cover-photo"){this.moveableInstance&&(this.moveableInstance.destroy(),this.moveableInstance=null);return}this._normalizeCoverTextPosition(o),this.moveableInstance?(this.moveableInstance.target=o,this.moveableInstance.updateRect()):(console.log("[App] Instantiating Moveable for element config groundwork."),this.moveableInstance=new window.Moveable(t,{target:o,draggable:!0,resizable:!0,rotatable:!0,snappable:!0,edge:!1,origin:!0,keepRatio:!1}),this.moveableInstance.on("drag",({target:n,transform:r})=>{const i=n.closest(".cover-section.front-cover, .cover-section.back-cover, .album-page")||n.parentElement;if(i){const a=i.getBoundingClientRect(),l=n.offsetWidth,c=n.offsetHeight,d=r.match(/translate\(([^,]+),\s*([^)]+)\)/);if(d){let p=parseFloat(d[1])||0,u=parseFloat(d[2])||0;const g=parseFloat(n.style.left)||0,m=parseFloat(n.style.top)||0,y=g+p,w=m+u,b=20;y<-(l-b)&&(p+=-(l-b)-y),y>a.width-b&&(p+=a.width-b-y),w<-(c-b)&&(u+=-(c-b)-w),w>a.height-b&&(u+=a.height-b-w),r=`translate(${p}px, ${u}px)`}}n.style.transform=r}).on("resize",({target:n,width:r,height:i,drag:a})=>{n.style.width=`${r}px`,n.style.height=`${i}px`,n.style.transform=a.transform}).on("rotate",({target:n,transform:r})=>{n.style.transform=r}).on("dragEnd",({target:n})=>{this.persistMoveableState(n)}).on("resizeEnd",({target:n})=>{this.persistMoveableState(n)}).on("rotateEnd",({target:n})=>{this.persistMoveableState(n)}))}persistMoveableState(e){if(!e)return;const t=e.dataset.selectableId,o=e.dataset.selectableType;if(!(!t||!o)){if(o==="cover-text"){h.state.cover.textPositions||(h.state.cover.textPositions={}),h.state.cover.textStyles||(h.state.cover.textStyles={}),h.state.cover.textStyles[t]||(h.state.cover.textStyles[t]={});const s=e.offsetParent||e.parentElement;if(!s)return;const n=s.getBoundingClientRect(),r=e.getBoundingClientRect(),i=r.left-n.left,a=r.top-n.top,l=(i/n.width*100).toFixed(1)+"%",c=(a/n.height*100).toFixed(1)+"%";e.style.transform="",e.style.position="absolute",e.style.left=l,e.style.top=c,h.state.cover.textPositions[t]={x:l,y:c,width:e.style.width||void 0,height:e.style.height||void 0},console.log(`[App] Persisted cover ${o} position: ${t} → (${l}, ${c})`),h.state.cover.textStyles[t].width=e.style.width,h.state.cover.textStyles[t].height=e.style.height,clearTimeout(window._moveableDebounce),window._moveableDebounce=setTimeout(()=>{h.pushState("Move Cover Element"),h.notify("coverPosition",h.state.cover)},500)}else if(o==="text"||o==="shape"||o==="element"||o==="qr"){const s=h.state.pages.find(n=>n.id===h.state.activePageId);if(s&&s.elements){const n=s.elements.find(r=>r.id===t);if(n){const r=e.offsetParent||e.parentElement;if(r){const i=r.getBoundingClientRect(),a=e.getBoundingClientRect(),l=a.left-i.left,c=a.top-i.top,d=parseFloat((l/i.width*100).toFixed(2)),p=parseFloat((c/i.height*100).toFixed(2));n.x=d,n.y=p,e.style.transform="",e.style.position="absolute",e.style.left=`${d}%`,e.style.top=`${p}%`,n.transform=""}n.pixelWidth=e.style.width,n.pixelHeight=e.style.height,console.log(`[App] Persisted page ${o} position: ${t} → (${n.x}%, ${n.y}%)`),clearTimeout(window._moveableDebounce),window._moveableDebounce=setTimeout(()=>{h.pushState("Move Element"),h.notify("pages",h.state.pages)},500)}}}}}setupKeyboardShortcuts(){document.addEventListener("keydown",e=>{if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.isContentEditable)return;const o=h.state.selection,n=navigator.platform.toUpperCase().indexOf("MAC")>=0?e.metaKey:e.ctrlKey;if(n&&e.key.toLowerCase()==="z"){e.preventDefault(),e.shiftKey?h.redo():h.undo();return}if(n&&o&&e.key.toLowerCase()==="c"){this.handleCopy(o);return}if(n&&e.key.toLowerCase()==="v"){this.handlePaste();return}if((e.key==="Backspace"||e.key==="Delete")&&o){e.preventDefault(),this.handleDeleteSelection(o);return}if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)&&o){e.preventDefault(),this.handleMoveSelection(o,e.key,e.shiftKey?10:1);return}})}handleDeleteSelection(e){const t=h.state;let o=t.pages.find(s=>s.id===t.activePageId);if(!o&&t.viewMode==="cover"){t.cover.frontPhotoId===e?(h.pushState("Delete Cover Photo"),t.cover.frontPhotoId=null,h.notify("cover",t.cover),h.state.selection=null,h.notify("selection",null)):t.cover.backPhotoId===e&&(h.pushState("Delete Cover Photo"),t.cover.backPhotoId=null,h.notify("cover",t.cover),h.state.selection=null,h.notify("selection",null));return}if(o){if(o.elements&&o.elements.find(s=>s.id===e)){h.pushState("Delete Element"),o.elements=o.elements.filter(s=>s.id!==e),h.state.selection=null,h.notify("pages",h.state.pages),h.notify("selection",null);return}if(o.photos&&Array.isArray(o.photos)&&o.photos.find(s=>s&&s.id===e))if(o.templateId){const s=o.photos.findIndex(n=>n&&n.id===e);if(s>-1){if(h.pushState("Delete Photo"),o.photos[s]=null,o.layout&&o.layout.slots){const n=o.layout.slots.find(r=>r.photoId===e);n&&(n.photoId=null)}h.state.selection=null,h.notify("pages",h.state.pages),h.notify("selection",null);return}}else{h.pushState("Delete Photo");const s=o.photos.findIndex(n=>n&&n.id===e);if(s>-1){o.photos.splice(s,1),this.layoutEngine&&(o.layout=this.layoutEngine.generateLayout(o.photos,o.layout?o.layout.name:null)),h.state.selection=null,h.notify("pages",h.state.pages),h.notify("selection",null);return}}}}handleMoveSelection(e,t,o){const s=h.state,n=s.pages.find(a=>a.id===s.activePageId);if(!n)return;let r=!1;const i=n.elements&&n.elements.find(a=>a.id===e);if(i){h.pushState("Move Element");let a=o*.25;t==="ArrowUp"&&(i.y-=a),t==="ArrowDown"&&(i.y+=a),t==="ArrowLeft"&&(i.x-=a),t==="ArrowRight"&&(i.x+=a),r=!0}else if(n.templateId){const a=n.layout&&n.layout.slots?n.layout.slots.find(l=>l.photoId===e):null;if(a){h.pushState("Pan Template Image"),a.crop||(a.crop={panX:50,panY:50,zoom:1});const l=o*2;t==="ArrowUp"&&(a.crop.panY=Math.max(0,(a.crop.panY||50)-l)),t==="ArrowDown"&&(a.crop.panY=Math.min(100,(a.crop.panY||50)+l)),t==="ArrowLeft"&&(a.crop.panX=Math.max(0,(a.crop.panX||50)-l)),t==="ArrowRight"&&(a.crop.panX=Math.min(100,(a.crop.panX||50)+l)),r=!0}else{n.textPositions||(n.textPositions={});let l=n.textPositions[e];if(l)l={...l};else{const m=document.querySelector(`[data-selectable-id="${e}"]`);m?l={x:m.style.left||"0%",y:m.style.top||"0%"}:l={x:"0%",y:"0%"}}h.pushState("Move Template Text");const c=(m,y)=>{let w=parseFloat(m)||0,b=m.toString().replace(/[0-9.-]/g,"")||"%";return w+y+b};let d=l.x.toString().replace(/[0-9.-]/g,"")||"%",p=l.y.toString().replace(/[0-9.-]/g,"")||"%",u=d==="%"?o*.2:o,g=p==="%"?o*.2:o;t==="ArrowUp"&&(l.y=c(l.y,-g)),t==="ArrowDown"&&(l.y=c(l.y,g)),t==="ArrowLeft"&&(l.x=c(l.x,-u)),t==="ArrowRight"&&(l.x=c(l.x,u)),n.textPositions[e]=l,r=!0}}r&&(h.notify("pages",s.pages),this.moveableInstance&&setTimeout(()=>this.moveableInstance.updateRect(),0))}handleCopy(e){const t=h.state,o=t.pages.find(n=>n.id===t.activePageId);if(!o)return;let s=o.elements&&o.elements.find(n=>n.id===e);if(s){this.clipboard={type:"element",data:JSON.parse(JSON.stringify(s))},console.log("[App] Copied user element",s.id);return}if(o.templateId){const n=o.textContent?o.textContent[e]:null;n&&(this.clipboard={type:"text",data:{id:e,content:n}},console.log("[App] Copied template text",e))}}handlePaste(){if(!this.clipboard)return;const e=h.state,t=e.pages.find(o=>o.id===e.activePageId);if(t){if(h.pushState("Paste Component"),this.clipboard.type==="element"){const o=JSON.parse(JSON.stringify(this.clipboard.data));o.id="elem_"+Date.now()+Math.random().toString(36).substr(2,5),o.x+=2,o.y+=2,t.elements||(t.elements=[]),t.elements.push(o),h.state.selection=o.id,h.notify("pages",e.pages),h.notify("selection",o.id),console.log("[App] Pasted user element")}else if(this.clipboard.type==="text"){const o={id:"text_"+Date.now()+Math.random().toString(36).substr(2,5),type:"text",content:this.clipboard.data.content,x:40,y:40,fontSize:24,color:"#000000",width:50};t.elements||(t.elements=[]),t.elements.push(o),h.state.selection=o.id,h.notify("pages",e.pages),h.notify("selection",o.id),console.log("[App] Pasted template text as free element")}}}bindEvents(){const e=document.getElementById("page-timeline");e&&e.addEventListener("click",b=>{const v=b.target.closest(".timeline-page");if(!v)return;if(console.log("[TIMELINE DELEGATION] Click on:",v.classList.toString(),"pageId:",v.dataset?.pageId?.substring(0,12)),v.classList.contains("cover-thumb")){if(h.state.viewMode==="cover")return;console.log("[TIMELINE DELEGATION] Switching to COVER"),this._manualRenderLock=!0,h._isBatchUpdating=!0,h.state.viewMode="cover",h.state.activePageId=null,h._isBatchUpdating=!1,this._rafPending=!1,this._pendingUpdates=new Set,this.renderCoverWithTemplate(),this.updateTimelineActiveState(h.state),this.updatePropertiesPanel(h.state),requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._manualRenderLock=!1})});return}const S=v.dataset?.pageId;if(!S){console.warn("[TIMELINE DELEGATION] No pageId on element");return}if(h.state.activePageId===S&&h.state.viewMode==="pages"){if(h.state.pages.find(C=>C.id===S)){console.log("[TIMELINE DELEGATION] EARLY RETURN: same page active and found in store");return}console.log("[TIMELINE DELEGATION] Same page active but NOT in store — forcing re-render")}console.log("[TIMELINE DELEGATION] Switching to page:",S.substring(0,12)),this._manualRenderLock=!0,h._isBatchUpdating=!0,h.state.activePageId=S,h.state.viewMode="pages",h._isBatchUpdating=!1,this._rafPending=!1,this._pendingUpdates=new Set;let f=h.state.pages.find(x=>x.id===S);if(!f&&window._magicPages&&window._magicPages.length>0&&(console.log("[TIMELINE DELEGATION] Page not in store! Restoring",window._magicPages.length,"pages from _magicPages backup"),h._isBatchUpdating=!0,h.state.pages=window._magicPages,h._isBatchUpdating=!1,f=h.state.pages.find(x=>x.id===S)),console.log("[TIMELINE DELEGATION] Page found:",!!f,"in",h.state.pages.length,"pages"),f)this.renderActivePage();else{const x=window._magicPages?.find(C=>C.id===S);if(x){console.log("[TIMELINE DELEGATION] Direct-rendering from _magicPages");const C=document.getElementById("canvas-container");C&&this.renderer.renderPageToContainer(x,h.state.assets,C,null)}else console.warn("[TIMELINE DELEGATION] Page completely not found anywhere!")}this.updateTimelineActiveState(h.state),this.updatePropertiesPanel(h.state),this.updateMoveable(h.state),requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._manualRenderLock=!1})})});const t=document.getElementById("btn-profile");t&&(t.onclick=()=>{this.profileModal&&this.profileModal.open()}),h.subscribe((b,v,S)=>{["pages","cover","coverPosition","assets","theme","history_restore"].includes(v)&&this.saveDebounced&&this.saveDebounced(b),v==="assets"&&(this._assetSidebarPending||(this._assetSidebarPending=!0,requestAnimationFrame(()=>{this._assetSidebarPending=!1,this.renderAssetSidebar&&this.renderAssetSidebar()}))),(v==="activePageId"||v==="pages"||v==="selection"||v==="theme"||v==="viewMode"||v==="cover"||v==="history_restore")&&(this._pendingUpdates||(this._pendingUpdates=new Set),this._pendingUpdates.add(v),this._rafPending||(this._rafPending=!0,requestAnimationFrame(()=>{this._rafPending=!1;const f=this._pendingUpdates;this._pendingUpdates=new Set;const x=f.has("pages")||f.has("cover")||f.has("activePageId")||f.has("theme")||f.has("viewMode")||f.has("history_restore");if(x&&!this._magicCreateRendering&&!this._manualRenderLock){let C=!1;if(b.viewMode==="cover"&&f.has("cover")&&!f.has("viewMode")&&!f.has("history_restore")){const I=document.activeElement,E=I&&(I.isContentEditable||I.id==="prop-cover-title"||I.id==="prop-cover-sub"||I.id==="prop-cover-spine"||I.id==="prop-inline-text"),T=document.querySelector('[data-selectable-type="cover-text"][contenteditable="true"]');(E||T)&&(console.log("[App] Skipping cover re-render — user is editing text"),C=!0)}if(!C&&f.size===1&&f.has("pages")&&b.viewMode!=="cover"){const I=b.pages.find(E=>E.id===b.activePageId);if(I)try{const E=JSON.stringify({id:I.id,photos:I.photos,textContent:I.textContent,textPositions:I.textPositions,background:I.background,spacing:I.spacing,layoutId:I.layout?.id||I.layout?.name||I.rawLayoutId,layoutSlots:I.layout?.slots?.map(T=>({id:T.photoId,crop:T.crop,x:T.x,y:T.y,w:T.width,h:T.height}))});this._lastPageFingerprint===E&&(C=!0),this._lastPageFingerprint=E}catch{}}else C||(this._lastPageFingerprint=null);C||(b.viewMode==="cover"?this.renderCoverWithTemplate():this.renderActivePage())}(f.has("pages")||f.has("theme")||f.has("history_restore"))&&(this.updateTimeline(b.pages,b.activePageId),this.refreshActivePageThumbnail()),f.has("cover")&&!f.has("pages")&&this.refreshCoverThumbnail(),(f.has("activePageId")||f.has("viewMode"))&&this.updateTimelineActiveState(b),(f.has("selection")||f.has("viewMode")||f.has("activePageId"))&&this.updatePropertiesPanel(b),(f.has("selection")||x)&&this.updateMoveable(b)})))});const o=document.getElementById("canvas-container");o.addEventListener("dragover",b=>{b.preventDefault(),b.dataTransfer.dropEffect="copy",o.classList.add("drop-target-active");const v=b.target.closest(".photo-slot");document.querySelectorAll(".photo-slot.drag-over-slot").forEach(S=>{S!==v&&S.classList.remove("drag-over-slot")}),v&&v.classList.add("drag-over-slot")}),o.addEventListener("dragleave",b=>{b.relatedTarget&&!o.contains(b.relatedTarget)&&(o.classList.remove("drop-target-active"),document.querySelectorAll(".drag-over-slot").forEach(v=>v.classList.remove("drag-over-slot")))}),o.addEventListener("drop",b=>{b.preventDefault(),console.log("[App] Drop event detected on canvas:",b.target),o.classList.remove("drop-target-active"),document.querySelectorAll(".drag-over-slot").forEach(x=>x.classList.remove("drag-over-slot"));const v=b.dataTransfer.getData("application/json");if(!v)return;const S=JSON.parse(v),f=b.target.closest(".photo-slot")||b.target.closest(".cover-photo-area")||b.target.closest(".front-cover")||b.target.closest(".back-cover");if(S.type==="slot-swap"&&f&&f.classList.contains("photo-slot")){const x=f.dataset.selectableId;x&&x!==S.photoId&&(h.pushState("Swap Photos"),this.swapPhotos(S.photoId,x));return}if(S.type==="photo")if(f)if(f.classList.contains("back-cover"))h.pushState("Add Photo to Back Cover"),h.state.cover||(h.state.cover={}),h.state.cover.backPhotoId=S.id,h.notify("cover",h.state.cover);else if(f.classList.contains("cover-photo-area")||f.classList.contains("front-cover"))h.state.cover?._coverGalleryId?(console.log("[Drop] Gallery cover active — blocking front cover photo drop. Use back cover instead."),h.pushState("Add Photo to Back Cover"),h.state.cover||(h.state.cover={}),h.state.cover.backPhotoId=S.id,h.notify("cover",h.state.cover)):(h.pushState("Add Photo to Front Cover"),h.state.cover||(h.state.cover={}),h.state.cover.frontPhotoId=S.id,h.notify("cover",h.state.cover));else if(f.classList.contains("empty-slot")){const x=parseInt(f.dataset.slotIndex);h.pushState("Add Photo to Slot"),this.addPhotoToSlot(S.id,x)}else{const x=f.dataset.selectableId;h.pushState("Replace Photo"),this.replacePhotoInSlot(x,S.id)}else{const x=o.getBoundingClientRect(),I=(b.clientX-x.left)/x.width;h.pushState("Add Photo"),this.addPhotoToPage(S.id,I)}else if(S.type==="text")this.addTextToPage(S.id);else if(S.type==="element"){const x=o.getBoundingClientRect(),C=b.clientX-x.left,I=b.clientY-x.top,E=C/x.width*100,T=I/x.height*100;h.pushState("Add Element"),this.addElementToPage(S.id,E,T)}else if(S.type==="frame"){const x=h.state,C=x.pages.find(I=>I.id===x.activePageId);if(f){const I=f.dataset.selectableId;if(C&&C.layout&&C.layout.slots){const E=C.layout.slots.find(T=>T.photoId===I);E&&(h.pushState("Apply Frame"),E.frameId=S.id,h.notify("pages",x.pages),console.log("[App] Applied frame",S.id,"to photo",I))}}else C&&(C.imageFrameId=S.id,h.notify("pages",x.pages),console.log("[App] Set page default frame",S.id))}}),o.addEventListener("click",b=>{const v=b.target.closest(".btn-remove-slot-photo");if(v){b.preventDefault(),b.stopImmediatePropagation();const S=parseInt(v.dataset.slotIndex);if(isNaN(S))return;if(confirm("להסיר את התמונה מהעמוד?")){const f=h.state.pages.find(x=>x.id===h.state.activePageId);f&&f.photos&&(f.photos.splice(S,1),h.notify("pages",h.state.pages))}}}),o.addEventListener("click",b=>{if(b.target.closest('*[class*="moveable-"]'))return;const v=b.target.closest("[data-selectable-id]");if(document.querySelectorAll(".selection-frame").forEach(S=>S.style.display="none"),document.querySelectorAll('[contenteditable="true"]').forEach(S=>{S.contentEditable="false",S.style.cursor="pointer"}),v){const S=v.dataset.selectableId,f=v.dataset.selectableType;if(h.state.selection!==S&&(h.state.selection=S,h.notify("selection",S)),f==="text"||f==="cover-text"){const x=v.querySelector(".selection-frame");x&&(x.style.display="block"),v.style.cursor="grab"}}else h.state.selection!==null&&(h.state.selection=null,h.notify("selection",null))}),o.addEventListener("dblclick",b=>{const v=b.target.closest('[data-selectable-type="text"], [data-selectable-type="cover-text"]');if(v){b.stopPropagation(),v.contentEditable="true",v.focus(),v.style.cursor="text",v.style.outline="none",v._isEditing=!0;const I=v.dataset.selectableId,E=()=>{v._isEditing=!1;const T=v.textContent.trim();if(v.contentEditable="false",v.style.cursor="grab",v.removeEventListener("blur",E),h.state.viewMode==="cover"){if(h.state.cover.textContent||(h.state.cover.textContent={}),h.state.cover.textContent[I]=T,(I==="cover-title"||I==="title")&&(h.state.cover.title=T),(I==="cover-subtitle"||I==="subtitle"||I==="date")&&(h.state.cover.subtitle=T),(I==="cover-spine"||I==="spine")&&(h.state.cover.spineText=T),I==="groomName"||I==="brideName"){const R=h.state.cover.textContent.groomName||"",$=h.state.cover.textContent.brideName||"";h.state.cover.title=$?`${R} & ${$}`:R}const k=document.getElementById("prop-cover-title"),L=document.getElementById("prop-cover-sub"),_=document.getElementById("prop-cover-spine");k&&(I==="cover-title"||I==="title")&&(k.value=T),L&&(I==="cover-subtitle"||I==="subtitle"||I==="date")&&(L.value=T),_&&(I==="cover-spine"||I==="spine")&&(_.value=T),h.pushState("Edit Cover Text"),h.notify("coverPosition",h.state.cover)}else{const k=h.state.pages.find(L=>L.id===h.state.activePageId);k&&(k.textContent||(k.textContent={}),k.textContent[I]=T,h.pushState("Edit Page Text"),h.notify("pages",h.state.pages))}};v.addEventListener("blur",E);return}const S=b.target.closest(".photo-slot");if(S){b.stopPropagation();const I=S.querySelector("img");I&&I.src&&!I.src.includes("placeholder")&&this.enterCropMode(S);return}const f=b.target.closest(".cover-photo-area"),x=b.target.closest(".back-cover"),C=f||x;if(C){b.stopPropagation(),b.preventDefault();const I=!!x&&!f,E=!!f;let T=!1;I?T=!!C.querySelector("img"):E&&(T=!!(h.state.cover&&h.state.cover.frontPhotoId)),T&&this.enterCoverCropMode(C,E?"front":"back");return}}),document.getElementById("btn-preview").addEventListener("click",async()=>{console.log("[App] Opening Album Preview...");const b=h.state.selectedTemplate?.id||h.state.pages[0]&&h.state.pages[0].templateId||h.state.cover&&h.state.cover.templateId;if(b&&this.templateSidebar&&this.templateSidebar.manager&&(!this.templateSidebar.manager.config||this.templateSidebar.manager.currentTemplateId!==b)){console.log("[App] Loading template config for preview:",b);try{await this.templateSidebar.manager.loadTemplate(b)}catch(f){console.warn("[App] Failed to load template config for preview:",f)}}const S=this.templateSidebar&&this.templateSidebar.manager&&this.templateSidebar.manager.config?this.templateSidebar.manager.config:null;ne(async()=>{const{albumPreview:f}=await import("./album-preview-Cl0Xg5rP.js");return{albumPreview:f}},__vite__mapDeps([0,1])).then(({albumPreview:f})=>{f.open(h.state.pages,h.state.cover,h.state.assets,S)}).catch(f=>{console.error("[App] Failed to load album preview:",f),alert("פתיחת התצוגה המקדימה נכשלה. אנא נסה שוב.")})}),document.getElementById("btn-remix-layout").addEventListener("click",()=>{const b=h.state,v=b.pages.find(C=>C.id===b.activePageId);if(!v)return;const S=v.templateId&&v.templateId.startsWith("layout-"),f=this.templateSidebar&&this.templateSidebar.manager?this.templateSidebar.manager:null,x=()=>{if(!v.photos&&v.layout&&v.layout.slots){const T=h.state.assets.photos;v.photos=v.layout.slots.filter(k=>k.photoId).map(k=>{const L=T.find(_=>_.id===k.photoId);return L&&k.shape&&(L.shape=k.shape),L}).filter(k=>k)}else v.photos&&v.layout&&v.layout.slots&&v.layout.slots.forEach(T=>{if(T.shape&&T.photoId){const k=v.photos.find(L=>L.id===T.photoId);k&&(k.shape=T.shape)}});!v._allPhotos&&v.photos&&v.photos.length>0&&(v._allPhotos=[...v.photos]);const C=v._allPhotos||v.photos||[];if(C.length===0)return;const I=v.layout?v.layout.name||v.layout.id:null,E=Q.getNextLayout(C,I);if(E){h.pushState("Remix Layout");const T=v.imageShape;v.photos=[...C],v.layout=E,T&&(v.imageShape=T),h.notify("pages",b.pages)}};if(v.templateId&&!S&&f){if(!f.config||f.currentTemplateId!==v.templateId){console.log("[App] Loading template config for remix:",v.templateId),f.loadTemplate(v.templateId).then(()=>{this.performTemplateRemix(v,f)||x()}).catch(C=>{console.warn("[App] Could not load template for remix, falling back:",C),x()});return}if(this.performTemplateRemix(v,f))return}x()}),document.getElementById("btn-review").addEventListener("click",async()=>{console.log("Generating Review PDF via Server...");const v=this.templateSidebar&&this.templateSidebar.manager&&this.templateSidebar.manager.config?this.templateSidebar.manager.config:null;v&&se.setTemplateConfig(v),await se.generatePDF(h.state.pages,h.state.cover,h.state.assets),document.getElementById("btn-order-print").style.display="inline-block"}),document.getElementById("btn-order-print").addEventListener("click",async()=>{console.log("Starting Order Flow...");const v=this.templateSidebar&&this.templateSidebar.manager&&this.templateSidebar.manager.config?this.templateSidebar.manager.config:null;v&&se.setTemplateConfig(v);const S=await se.generatePDF(h.state.pages,h.state.cover,h.state.assets,!0);S&&bt.startOrderFlow(S)});const s=document.getElementById("btn-magic-create");s&&s.addEventListener("click",async()=>{const b=h.state.assets.photos;if(!b||b.length<4){alert("אנא הוסף לפחות 4 תמונות קודם (השתמש בכפתור ה-'+' בלשונית התמונות).");return}this.magicCreateGenerationStarted=!0,window.magicLauncher?window.magicLauncher.open(b):(console.error("MagicLauncher module not loaded"),alert("Magic Create בעבודה... אנא נסה שוב בעוד רגע."),this.magicCreateGenerationStarted=!1)}),document.querySelectorAll(".nav-item").forEach(b=>{b.addEventListener("click",v=>{const S=b.dataset.tab;document.querySelectorAll(".nav-item").forEach(f=>f.classList.remove("active")),b.classList.add("active"),document.querySelectorAll(".tab-pane").forEach(f=>f.classList.remove("active")),document.getElementById(`tab-${S}`).classList.add("active")})});const n=document.querySelector(".btn-add-page");n&&n.addEventListener("click",()=>{h.pushState("Add Page"),h.addPage(),console.log("[App] Added new page")});const r=document.getElementById("btn-add-photos-sidebar"),i=document.getElementById("upload-options-modal");r&&i&&r.addEventListener("click",()=>{i.style.display="flex"});const a=document.getElementById("btn-upload-local"),l=document.getElementById("file-upload-input");a&&l&&(a.addEventListener("click",()=>{l.click()}),l.addEventListener("change",async b=>{const v=b.target.files;if(v&&v.length>0){h.pushState("Upload Photos");const S=[];for(let f=0;f<v.length;f++){const x=v[f],C=URL.createObjectURL(x);S.push({id:"local_"+crypto.randomUUID(),url:C,file:x,isLocal:!0,ratio:1.5})}i.style.display="none",we.review(S,(f,x)=>{if(h.state.assets.photos=[...h.state.assets.photos,...f],this._animateNextRender=!0,this.renderAssetSidebar(),S.forEach(C=>{const I=x.get(C.id);I&&(C.visionFocalPoint={focalX:I.focalX,focalY:I.focalY},C._visionAnalysis=I)}),Ie.batchAnalyzePhotos(f).then(C=>{let I=!1;h.state.assets.photos.forEach(E=>{C[E.id]&&!E.visionFocalPoint&&(E.visionFocalPoint=C[E.id],I=!0)}),I&&window.app&&(console.log("[App] Background Vision Batch Completed. Refreshing UI."),h.notify("pages",h.state.pages))}),this.isAutoStart&&this.templateSidebar){this.magicCreateGenerationStarted=!0;const C=this.targetTemplateId||"family-roots-v1";console.log(`[App] Auto-Start: Generating book from local files using ${C}...`),setTimeout(async()=>{await this.templateSidebar.handleTemplateSelect(C),this.isAutoStart=!1},100)}}),l.value=""}}));const c=document.getElementById("btn-prev-page"),d=document.getElementById("btn-next-page");if(c&&d){const b=()=>{const f=h.state;if(f.viewMode==="cover")return;const x=f.pages.findIndex(C=>C.id===f.activePageId);x>0?(h.state.activePageId=f.pages[x-1].id,h.notify("activePageId",h.state.activePageId),this.renderActivePage(),this.updateTimeline(f.pages,h.state.activePageId)):(h.state.viewMode="cover",h.notify("viewMode","cover"),this.renderCoverWithTemplate(),this.updateTimeline(f.pages,null))},v=()=>{const f=h.state;if(f.viewMode==="cover"){h.state.viewMode="pages",h.notify("viewMode","pages"),f.pages.length>0&&(h.state.activePageId=f.pages[0].id,h.notify("activePageId",h.state.activePageId),this.renderActivePage()),this.updateTimeline(f.pages,h.state.activePageId);return}const x=f.pages.findIndex(C=>C.id===f.activePageId);x<f.pages.length-1&&(h.state.activePageId=f.pages[x+1].id,h.notify("activePageId",h.state.activePageId),this.renderActivePage(),this.updateTimeline(f.pages,h.state.activePageId))},S=()=>{const f=document.getElementById("canvas-container");return f?f.classList.contains("force-ltr"):!1};c.addEventListener("click",()=>{S()?b():v()}),d.addEventListener("click",()=>{S()?v():b()})}const p=document.getElementById("btn-undo"),u=document.getElementById("btn-redo");p&&p.addEventListener("click",()=>{h.undo(),this.renderActivePage(),h.state.viewMode==="cover"&&this.renderCoverWithTemplate(),this.updatePropertiesPanel(h.state)}),u&&u.addEventListener("click",()=>{h.redo(),this.renderActivePage(),h.state.viewMode==="cover"&&this.renderCoverWithTemplate(),this.updatePropertiesPanel(h.state)});const g=document.getElementById("btn-new-project");g&&g.addEventListener("click",()=>this.startNewProject(!0));const m=document.getElementById("btn-share-project");m&&m.addEventListener("click",()=>this.openShareModal());const y=document.getElementById("btn-mobile-menu");if(y&&!(window.MobileEditor&&window.MobileEditor.toggleLeftPanel)){let b=document.querySelector(".mobile-sidebar-backdrop");b||(b=document.createElement("div"),b.className="mobile-sidebar-backdrop",document.body.appendChild(b));const v=document.getElementById("sidebar-left"),S=()=>{const f=v.classList.toggle("expanded");b.classList.toggle("active",f)};y.addEventListener("click",S),b.addEventListener("click",()=>{v.classList.remove("expanded"),b.classList.remove("active")})}const w=document.getElementById("btn-upload-google");w&&w.addEventListener("click",async()=>{try{const b=await be.openPicker();b&&b.length>0&&(h.pushState("Upload Google Photos"),i.style.display="none",we.review(b,(v,S)=>{h.state.assets.photos.length>0?window.confirm(`כבר יש תמונות בספרייה.

לחץ אישור כדי להוסיף את התמונות החדשות.
לחץ ביטול כדי להחליף את כל התמונות.`)?(h.state.assets.photos=[...h.state.assets.photos,...v],console.log("[App] User chose to APPEND to library.")):(h.state.assets.photos=v,console.log("[App] User chose to REPLACE library.")):h.state.assets.photos=v,this.renderAssetSidebar(),console.log("Imported Google Photos:",v.length),h.notify("assets",h.state.assets)}))}catch(b){console.error("Google Photos Error:",b);const v=b.message||b.toString();v.includes("User not logged in")?alert("אנא התחבר קודם (כפתור בצד ימין למעלה) כדי להשתמש ב-Google Photos."):alert("שגיאה: "+v)}})}performTemplateRemix(e,t){const o=e.rawLayoutId||(e.layout?e.layout.id:null);if((!e.photos||e.photos.length===0)&&e.layout&&e.layout.slots){const r=h.state.assets?.photos||[];e.photos=e.layout.slots.filter(i=>i.photoId).map(i=>r.find(a=>a.id===i.photoId)).filter(i=>i),console.log("[App] Remix: Reconstructed page.photos from slots:",e.photos.length)}const s=e.photos?e.photos.length:e.layout?.slots?e.layout.slots.filter(r=>r.photoId).length:0,n=t.getAlternativeLayoutId(o,s);if(console.log("[App] Remix: current layout:",o,"next layout:",n,"photoCount:",s),n){const r=t.regeneratePage(e,n);if(r){console.log("[App] Remixed template layout to:",r.layout.name);const i=h.state,a=i.pages.findIndex(l=>l.id===e.id);if(a!==-1){h.pushState("Remix Layout");const l=[...i.pages];l[a]=r,h.state.pages=l,h.state.selection=null,h.notify("pages",h.state.pages),this.updatePropertiesPanel(h.state)}return!0}}else console.warn("[App] No alternative layout found for photoCount:",s);return!1}addPhotoToPage(e,t=.5){const o=h.state;if(o.viewMode==="cover"){t>.5?o.cover._coverGalleryId?(console.log("[addPhotoToPage] Gallery cover active — redirecting front drop to back cover"),o.cover.backPhotoId=e):o.cover.frontPhotoId=e:o.cover.backPhotoId=e,h.notify("cover",o.cover);return}let s=o.pages.findIndex(p=>p.id===o.activePageId);if(s===-1&&o.pages.length>0&&(console.warn("[App] No active page ID found during drop. Defaulting to current stored active ID or first page."),o.activePageId||(h.state.activePageId=o.pages[0].id,s=0)),s===-1){console.error("[App] Cannot add photo. No valid page found.");return}console.log("[App] Adding photo to page",e,"Index:",s);const n={...o.pages[s]},r=o.assets.photos.find(p=>p.id===e);if(!r){console.warn("[App] Photo not found in assets:",e);return}const i=[...n.photos||[],r];n.photos=i,console.log("[App] New Photos list:",n.photos.length,n.photos);let a=null,l=null;const c=n.templateId&&n.templateId.startsWith("layout-");if(n.templateId&&!c&&this.templateSidebar&&this.templateSidebar.manager){const p=this.templateSidebar.manager;if(p.config&&p.currentTemplateId===n.templateId){const u=p.getLayoutIdForCount(i.length);u?(console.log("[App] Found template layout for count:",i.length,u),l=p.regeneratePage(n,u)):console.warn("[App] No template layout found for photo count:",i.length)}}if(l){const p=[...o.pages];p[s]=l,h.state.pages=p,h.notify("pages",h.state.pages);return}a=Q.generateLayout(n.photos),console.log("[App] Generated Layout fallback:",a),n.layout=a;const d=[...o.pages];d[s]=n,h.state.pages=d}addTextToPage(e){const t=h.state,o=t.pages.findIndex(l=>l.id===t.activePageId);if(o===-1)return;const s={...t.pages[o]};s.elements||(s.elements=[]);const n=window.TEXT_STYLES?.find(l=>l.id===e),r=n?n.previewText||"Text":"Your Text",i={id:`txt_${crypto.randomUUID()}`,type:"text",styleId:e,content:r,x:50,y:50,fontSize:24,color:n?.style?.color||"#000000"};s.elements.push(i),h.state.selection=i.id;const a=[...t.pages];a[o]=s,h.state.pages=a}addElementToPage(e,t=50,o=50){if(h.state.viewMode==="cover"){console.warn("[App] Adding elements directly to cover is unsupported via standard elements array, routing to first page or skipping.");return}const s=h.state,n=s.pages.findIndex(c=>c.id===s.activePageId);if(n===-1)return;const r={...s.pages[n]},i=window.ELEMENTS_LIBRARY?.find(c=>c.id===e);if(!i)return;r.elements||(r.elements=[]);const a={id:"elem_"+Date.now()+Math.floor(Math.random()*1e3),type:"element",url:i.url,x:t-10,y:o-10,pixelWidth:"100px",pixelHeight:"100px",zIndex:10};r.elements.push(a),h.state.selection=a.id;const l=[...s.pages];l[n]=r,h.state.pages=l}swapPhotos(e,t){const o=h.state;if(o.viewMode==="cover"){const r=o.cover,i=e===r.frontPhotoId,a=e===r.backPhotoId,l=t===r.frontPhotoId,c=t===r.backPhotoId;if(i&&c||a&&l){h.pushState("Swap Cover Photos");const d=r.frontPhotoId;r.frontPhotoId=r.backPhotoId,r.backPhotoId=d,h.notify("cover",r),console.log("[App] Swapped cover photos")}return}const s=o.pages.findIndex(r=>r.id===o.activePageId);if(s===-1)return;const n={...o.pages[s]};if(n.templateId&&n.photos&&Array.isArray(n.photos)){const r=n.photos.findIndex(a=>a.id===e),i=n.photos.findIndex(a=>a.id===t);if(r!==-1&&i!==-1){const a=n.photos[r];n.photos[r]=n.photos[i],n.photos[i]=a;const l=[...o.pages];l[s]=n,h.state.pages=l,console.log("[App] Swapped template photos",e,t)}}else{const r=n.layout.slots.find(a=>a.photoId===e),i=n.layout.slots.find(a=>a.photoId===t);if(r&&i){const a=r.photoId;r.photoId=i.photoId,i.photoId=a;const l=[...o.pages];l[s]=n,h.state.pages=l,console.log("[App] Swapped photos",e,t)}}}replacePhotoInSlot(e,t){const o=h.state;if(o.viewMode==="cover"){const r=o.cover;e===r.frontPhotoId?(h.pushState("Replace Front Cover"),r.frontPhotoId=t,h.notify("cover",r)):e===r.backPhotoId&&(h.pushState("Replace Back Cover"),r.backPhotoId=t,h.notify("cover",r));return}const s=o.pages.findIndex(r=>r.id===o.activePageId);if(s===-1)return;const n={...o.pages[s]};if((!n.photos||!Array.isArray(n.photos))&&(n.photos=[]),n.templateId&&n.photos.length>0){if(n.photos.find(a=>a&&a.id===t))return;const r=n.photos.findIndex(a=>a&&a.id===e),i=o.assets.photos.find(a=>a.id===t);if(r!==-1&&i){if(n.photos[r]=i,n.layout&&n.layout.slots){const l=n.layout.slots.find(c=>c.photoId===e);l&&(l.photoId=t)}const a=[...o.pages];a[s]=n,h.state.pages=a,console.log("[App] Replaced template photo",e,"with",t)}}else{if(n.photos.length>0&&n.photos.find(i=>i&&i.id===t))return;const r=n.layout&&n.layout.slots?n.layout.slots.find(i=>i.photoId===e):null;if(r){const i=n.photos.findIndex(l=>l&&l.id===e),a=o.assets.photos.find(l=>l.id===t);if(i>-1&&a){n.photos[i]=a,r.photoId=t;const l=[...o.pages];l[s]=n,h.state.pages=l,console.log("[App] Replaced photo in slot",e,"with",t)}}else{const i=o.assets.photos.find(a=>a.id===t);if(i){n.photos.push(i),typeof Q<"u"&&Q.generateLayout&&(n.layout=Q.generateLayout(n.photos));const a=[...o.pages];a[s]=n,h.state.pages=a,h.notify("pages",h.state.pages),console.log("[App] Added photo to page (no slot found)",t)}}}}addPhotoToSlot(e,t){const o=h.state,s=o.pages.findIndex(i=>i.id===o.activePageId);if(s===-1)return;const n={...o.pages[s]},r=o.assets.photos.find(i=>i.id===e);if(r&&n.photos&&Array.isArray(n.photos)){n.photos[t]=r,n.layout&&n.layout.slots&&n.layout.slots[t]&&(n.layout.slots[t].photoId=e);const i=[...o.pages];i[s]=n,h.state.pages=i,h.notify("pages",i),console.log("[App] Added photo to empty slot",t)}}startNewProject(e=!0){if(e&&!window.confirm("האם אתה בטוח שברצונך להתחיל פרויקט חדש? פעולה זו תנקה את האלבום הנוכחי ותסיר את כל התמונות שיובאו."))return;console.log("[App] Starting new project (Full Reset)...");const t=document.getElementById("btn-new-project");t&&(t.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> מנקה...'),window._magicPages=null,window._magicCover=null,window._magicAssets=null,window._magicPrompt=null,window._magicIsHebrew=null,window.photoQualityService&&(window.photoQualityService.analysisCache&&window.photoQualityService.analysisCache.clear(),window.photoQualityService.qualityCache&&window.photoQualityService.qualityCache.clear()),window.app&&(window.app.magicCreateGenerationStarted=!1,window.app._magicCreateRendering=!1),h.reset(),h.addPage(),h.state.viewMode="pages",U.currentProjectId=null,h.state.user&&U.saveProject(h.state.user.uid,h.state),(document.getElementById("canvas-container")||document.getElementById("editor-canvas"))&&this.renderActivePage(),this._lastTimelineHash=null,this.updateTimeline&&this.updateTimeline(h.state.pages,h.state.activePageId),this.renderAssetSidebar();const s=document.getElementById("properties-panel");s&&(s.innerHTML='<div class="panel-header"><h3>מאפיינים</h3></div><p style="padding:12px;color:#888;">בחר אלמנט לעריכה</p>'),this.templateSidebar&&this.templateSidebar.manager&&(this.templateSidebar.manager.currentTemplateId=null,this.templateSidebar.manager.config=null);const n=document.getElementById("cover-preview");n&&(n.innerHTML=""),h.state.cover&&(h.state.cover._coverGalleryId=null),t&&(t.innerHTML='<i class="fa-solid fa-file-circle-plus"></i> חדש'),console.log("[App] New project created successfully. State:",{pages:h.state.pages.length,photos:h.state.assets.photos.length,activePageId:h.state.activePageId})}updatePropertiesPanel(e){const t=document.getElementById("properties-panel");if(t&&t.contains(document.activeElement)){const i=document.activeElement.tagName,a=document.activeElement.type;if(["INPUT","TEXTAREA","SELECT"].includes(i)&&(a==="text"||i==="TEXTAREA"||a==="color"))return}if(e.viewMode==="cover"){if(e.selection){const i=document.querySelector(`[data-selectable-id="${e.selection}"]`);i&&(i.dataset.selectableType==="cover-text"||i.dataset.selectableType==="text")?this.renderCoverTextProperties(t,e.cover,e.selection):i&&i.dataset.selectableType==="cover-photo"?t.innerHTML='<div class="panel-header"><h3>תמונת כריכה</h3></div><p>נבחרה תמונה. לחץ עליה פעמיים כדי להזיז, או גרור תמונה חדשה.</p>':this.renderCoverProperties(t,e.cover)}else this.renderCoverProperties(t,e.cover);return}const o=e.selection,s=e.pages.find(i=>i.id===e.activePageId);if(!s){t.innerHTML='<div class="empty-state">לא נבחר עמוד</div>';return}let n=s.elements&&s.elements.find(i=>i.id===o);if(!n&&s.templateId&&o){const _ec=s.textContent?.[o];const _de=document.querySelector(`[data-selectable-id="${o}"][data-selectable-type="text"]`);if(_ec!==void 0||_de){n={id:o,content:_ec!==void 0?_ec:(_de?.textContent?.trim()||""),isTemplate:!0};}}if(s.layout&&s.layout.slots?s.layout.slots.find(i=>i.photoId===o):null){t.innerHTML=`
                <div class="panel-header">
                    <h3>מאפייני תמונה</h3>
                </div>
                <div style="padding:15px;">
                    <p>מזהה תמונה: ${o.substring(0,8)}...</p>
                    
                    <button id="btn-magic-edit" class="btn-primary" style="width:100%; margin-top:10px; background: linear-gradient(90deg, #a855f7, #ec4899);">
                        <i class="fa-solid fa-wand-magic"></i> עריכת קסם (AI)
                    </button>
                </div>
            `;const i=document.getElementById("btn-magic-edit");i&&(i.onclick=async()=>{const a=window.prompt("✨ עריכת קסם: מה לשנות?");if(!a)return;const l=e.assets.photos.find(c=>c.id===o);if(l){alert("עריכת קסם יוצרת... אנא המתן!");try{const c=await ie.editImage(l.url,a);h.pushState("Magic Edit"),l.url=c,h.notify("assets",e.assets)}catch(c){alert("העריכה נכשלה: "+c.message)}}});return}if(n){if(n.type==="qr"){const a=n.isVideo;t.innerHTML=`
                    <div class="panel-header">
                        <h3>מאפייני QR Code</h3>
                    </div>
                    <div style="padding:15px; display:flex; flex-direction:column; gap:12px; text-align: right;">
                        <div style="text-align:center; padding:12px; background:rgba(108,52,131,0.1); border-radius:10px;">
                            <i class="fa-solid fa-qrcode" style="font-size:2rem; color:#a855f7; margin-bottom:8px; display:block;"></i>
                            <span style="color:#e2e8f0; font-weight:600;">QR Code</span>
                        </div>
                        <div>
                            <label style="font-size:0.85rem; color:#94a3b8;">סוג קישור</label>
                            <div style="padding:8px 12px; background:rgba(255,255,255,0.05); border-radius:6px; margin-top:4px; display:flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-${a?"video":"globe"}" style="color:${a?"#ff6b6b":"#60a5fa"};"></i>
                                <span style="color:#e2e8f0; font-size:0.9rem;">${a?"סרטון":"אתר"}</span>
                            </div>
                        </div>
                        <div>
                            <label style="font-size:0.85rem; color:#94a3b8;">כתובת URL</label>
                            <div dir="ltr" style="padding:8px 12px; background:rgba(255,255,255,0.05); border-radius:6px; margin-top:4px; word-break:break-all; color:#a78bfa; font-size:0.8rem;">
                                ${n.targetUrl||"N/A"}
                            </div>
                        </div>
                        <div>
                            <label style="font-size:0.85rem; color:#94a3b8;">צבע</label>
                            <div style="padding:8px 12px; background:rgba(255,255,255,0.05); border-radius:6px; margin-top:4px; color:#e2e8f0;">
                                ${n.colorName||"Custom"}
                            </div>
                        </div>
                        <button id="btn-delete-qr" style="padding:10px; background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:8px; cursor:pointer; font-weight:600; display:flex; align-items:center; justify-content:center; gap:6px;">
                            <i class="fa-solid fa-trash"></i> מחיקת QR Code
                        </button>
                    </div>
                `,document.getElementById("btn-delete-qr").addEventListener("click",()=>{confirm("למחוק את ה-QR Code?")&&(h.pushState("Delete QR Code"),s.elements=s.elements.filter(l=>l.id!==o),h.state.selection=null,h.notify("pages",h.state.pages),h.notify("selection",null))});return}if(n.type==="element"){t.innerHTML=`
                    <div class="panel-header">
                        <h3>מאפייני איור/אלמנט</h3>
                    </div>
                    <div style="padding:15px; display:flex; flex-direction:column; gap:10px; text-align: right;">
                        
                        <div>
                            <label>שינוי גוון (Color Hue)</label>
                            <input type="range" id="prop-el-hue" min="0" max="360" value="${n.filterHue||0}">
                            <span id="prop-el-hue-val" style="font-size: 12px; color: #888;">${n.filterHue||0}°</span>
                        </div>

                        <div>
                            <label>בהירות (Brightness)</label>
                            <input type="range" id="prop-el-bright" min="0" max="200" value="${n.filterBrightness||100}">
                            <span id="prop-el-bright-val" style="font-size: 12px; color: #888;">${n.filterBrightness||100}%</span>
                        </div>

                        <div style="display:flex; align-items:center; justify-content: space-between; margin-top: 10px;">
                            <label>הצללה (Drop Shadow)</label>
                            <input type="checkbox" id="prop-el-shadow" ${n.filterShadow?"checked":""}>
                        </div>
                        
                        ${n.filterShadow?`
                        <div>
                            <label>צבע הצללה</label>
                            <div style="display:flex; align-items:center;">
                                <input type="color" id="prop-el-shadow-color" value="${n.filterShadowColor||"#000000"}">
                            </div>
                        </div>`:""}

                       <button class="btn-secondary btn-sm" id="btn-delete-element" style="color:red; border-color:red; margin-top:20px;">
                            <i class="fa-solid fa-trash"></i> מחק אלמנט
                       </button>
                    </div>
                `;const a=document.getElementById("prop-el-hue"),l=document.getElementById("prop-el-hue-val");a.addEventListener("input",g=>{n.filterHue=parseInt(g.target.value),l.textContent=n.filterHue+"°";const m=document.querySelector(`[data-selectable-id="${o}"] img`);if(m){let y="";n.filterHue&&(y+=`hue-rotate(${n.filterHue}deg) `),n.filterBrightness&&n.filterBrightness!==100&&(y+=`brightness(${n.filterBrightness}%) `),n.filterShadow&&(y+=`drop-shadow(2px 4px 6px ${n.filterShadowColor||"rgba(0,0,0,0.5)"}) `),m.style.filter=y.trim()}});const c=document.getElementById("prop-el-bright"),d=document.getElementById("prop-el-bright-val");c.addEventListener("input",g=>{n.filterBrightness=parseInt(g.target.value),d.textContent=n.filterBrightness+"%";const m=document.querySelector(`[data-selectable-id="${o}"] img`);if(m){let y="";n.filterHue&&(y+=`hue-rotate(${n.filterHue}deg) `),n.filterBrightness&&n.filterBrightness!==100&&(y+=`brightness(${n.filterBrightness}%) `),n.filterShadow&&(y+=`drop-shadow(2px 4px 6px ${n.filterShadowColor||"rgba(0,0,0,0.5)"}) `),m.style.filter=y.trim()}}),document.getElementById("prop-el-shadow").addEventListener("change",g=>{n.filterShadow=g.target.checked,h.notify("pages",h.state.pages)});const u=document.getElementById("prop-el-shadow-color");u&&u.addEventListener("input",g=>{n.filterShadowColor=g.target.value;const m=document.querySelector(`[data-selectable-id="${o}"] img`);if(m){let y="";n.filterHue&&(y+=`hue-rotate(${n.filterHue}deg) `),n.filterBrightness&&n.filterBrightness!==100&&(y+=`brightness(${n.filterBrightness}%) `),n.filterShadow&&(y+=`drop-shadow(2px 4px 6px ${n.filterShadowColor||"rgba(0,0,0,0.5)"}) `),m.style.filter=y.trim()}}),document.getElementById("btn-delete-element").addEventListener("click",()=>{confirm("למחוק את האלמנט הזה?")&&(h.pushState("Delete Element"),s.elements=s.elements.filter(g=>g.id!==o),h.state.selection=null,h.notify("pages",h.state.pages),h.notify("selection",null))});return}if(n.isTemplate===!0)t.innerHTML=`
                    <div class="panel-header">
                        <h3>מאפייני טקסט</h3>
                    </div>
                    <div style="padding:15px; display:flex; flex-direction:column; gap:10px; text-align: right;">
                        <div>
                            <label>תוכן</label>
                            <textarea id="prop-text-content" rows="5" style="width:100%; border-radius:4px; padding:5px; font-family: inherit; text-align: right;" dir="rtl">${n.content||""}</textarea>
                        </div>
                        <div style="color: #888; font-size: 12px;">
                            <i class="fa-solid fa-info-circle"></i> סגנון הגופן נקבע על ידי עיצוב התבנית
                        </div>
                    </div>
                `,document.getElementById("prop-text-content").addEventListener("input",l=>{if(!s.textContent)s.textContent={};s.textContent[o]=l.target.value;const c=document.querySelector(`[data-selectable-id="${o}"]`);c&&(c.textContent=l.target.value);clearTimeout(s._thumbTimer);s._thumbTimer=setTimeout(()=>{window.app&&window.app.refreshActivePageThumbnail&&window.app.refreshActivePageThumbnail()},600)});else{t.innerHTML=`
                    <div class="panel-header">
                        <h3>מאפייני טקסט</h3>
                    </div>
                    <div style="padding:15px; display:flex; flex-direction:column; gap:10px; text-align: right;">
                        <div>
                            <label>תוכן</label>
                            <textarea id="prop-text-content" rows="3" style="width:100%; border-radius:4px; padding:5px; text-align: right;" dir="rtl">${n.content}</textarea>
                        </div>

                        <div>
                            <label>גודל גופן</label>
                            <input type="range" id="prop-text-size" min="10" max="100" value="${n.fontSize||24}">
                            <span id="prop-text-size-val">${n.fontSize||24}px</span>
                        </div>

                        <div>
                            <label>צבע</label>
                            <div style="display:flex; align-items:center;">
                                <input type="color" id="prop-text-color" value="${n.color||"#000000"}">
                            </div>
                        </div>
                         <div>
                            <label>משפחת גופנים</label>
                            <select id="prop-text-font" style="width:100%; padding:5px;">
                                <option value="sans-serif">Sans Serif</option>
                                <option value="serif">Serif</option>
                                <option value="monospace">Monospace</option>
                                <option value="'Playfair Display', serif">Playfair Display</option>
                                <option value="'Montserrat', sans-serif">Montserrat</option>
                            </select>
                        </div>

                       <button class="btn-secondary btn-sm" id="btn-delete-text" style="color:red; border-color:red; margin-top:10px;">
                            <i class="fa-solid fa-trash"></i> מחק טקסט
                       </button>
                    </div>
                `,document.getElementById("prop-text-content").addEventListener("input",u=>{n.content=u.target.value;const g=document.querySelector(`[data-selectable-id="${o}"]`);g&&(g.textContent=u.target.value)});const l=document.getElementById("prop-text-size"),c=document.getElementById("prop-text-size-val");l.addEventListener("input",u=>{n.fontSize=parseInt(u.target.value),c.textContent=u.target.value+"px";const g=document.querySelector(`[data-selectable-id="${o}"]`);g&&(g.style.fontSize=u.target.value+"px")}),document.getElementById("prop-text-color").addEventListener("input",u=>{n.color=u.target.value,h.notify("pages",h.state.pages)});const p=document.getElementById("prop-text-font");n.fontFamily&&(p.value=n.fontFamily),p.addEventListener("change",u=>{n.fontFamily=u.target.value,h.notify("pages",h.state.pages)}),document.getElementById("btn-delete-text").addEventListener("click",()=>{confirm("למחוק את הטקסט הזה?")&&(h.pushState("Delete Text"),s.elements=s.elements.filter(u=>u.id!==o),h.state.selection=null,h.notify("pages",h.state.pages),h.notify("selection",null))})}return}this.renderPageProperties(t,s)}renderAuthUI(){const e=h.state.user,t=document.querySelector(".sidebar-nav");if(!t)return;let o=document.getElementById("btn-auth");o||(o=document.createElement("button"),o.id="btn-auth",o.className="nav-item",o.style.marginTop="auto",o.style.marginBottom="20px",o.style.display="flex",o.style.alignItems="center",o.style.justifyContent="center",t.appendChild(o)),e?(o.innerHTML=`
                <img src="${e.photoURL||"https://via.placeholder.com/24"}" 
                     style="width:28px;height:28px;border-radius:12px;object-fit:cover;">
            `,o.title=`Logged in as ${e.displayName||e.email}. Click to view Profile.`,o.onclick=()=>{window.app&&window.app.profileModal?window.app.profileModal.open():this.profileModal&&this.profileModal.open()},o.style.border="2px solid #27ae60"):(o.innerHTML='<i class="fa-brands fa-google"></i>',o.title="Login with Google",o.onclick=async()=>{try{await G.signInWithGoogle()}catch(s){console.error(s),alert("התחברות נכשלה. ראה פרטים במסוף.")}},o.style.border="none")}renderPageProperties(e,t){e.innerHTML=`
            <div class="panel-header">
                <h3>הגדרות עמוד</h3>
            </div>
            
            <div style="padding: 20px;">
                <!-- Layout -->
                <div class="prop-group">
                    <label>פריסה</label>
                    <div class="layout-selector">
                        <button class="layout-btn" title="יחיד / פוקוס"><i class="fa-regular fa-square"></i></button>
                        <button class="layout-btn" title="כפול / מפוצל"><i class="fa-solid fa-table-columns"></i></button>
                        <button class="layout-btn" title="גריד / מעורב"><i class="fa-solid fa-border-all"></i></button>
                    </div>
                </div>

                <!-- Slide (Spacing/Padding) -->
                <div class="prop-group">
                    <label>רווח פנימי (שוליים) <span id="val-spacing" style="color:#888;">${t.spacing||0}px</span></label>
                    <input type="range" id="prop-page-spacing" min="0" max="40" value="${t.spacing||0}">
                </div>

                <!-- Color -->
                <div class="prop-group">
                    <label>צבע רקע</label>
                    <div class="color-picker-wrapper">
                        <input type="color" id="prop-page-color" class="color-input-hidden" value="${t.background&&typeof t.background=="string"&&t.background.startsWith("#")?t.background:t.background&&t.background.color?t.background.color:"#ffffff"}">
                        <div class="color-icon"><i class="fa-solid fa-eye-dropper"></i></div>
                    </div>
                </div>

                <!-- Text (Notes/Caption Placeholder) -->
                <div class="prop-group">
                    <label>הערה / כיתוב</label>
                    <input type="text" placeholder="הוסף הערה לעמוד..." class="full-width">
                </div>

                <!-- QR Code -->
                <div class="prop-group">
                    <label>QR Code</label>
                    <button id="btn-add-qr" class="full-width" style="
                        padding: 10px 16px;
                        background: linear-gradient(135deg, #6C3483, #2E86C1);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 13px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: all 0.2s ease;
                    ">
                        <i class="fa-solid fa-qrcode"></i>
                        הוסף QR Code
                    </button>
                </div>
            </div>
        `,e.querySelectorAll(".layout-btn").forEach((n,r)=>{n.addEventListener("click",()=>{const i=h.state,a=t.templateId&&t.templateId.startsWith("layout-"),l=window.app.templateSidebar&&window.app.templateSidebar.manager?window.app.templateSidebar.manager:null,c=()=>{if(!t.photos&&t.layout&&t.layout.slots){const m=h.state.assets.photos;t.photos=t.layout.slots.filter(y=>y.photoId).map(y=>m.find(w=>w.id===y.photoId)).filter(y=>y)}!t._allPhotos&&t.photos&&t.photos.length>0&&(t._allPhotos=[...t.photos]);const p=t._allPhotos||t.photos||[];if(p.length===0)return;let u=null;const g=t.layout?t.layout.name||t.layout.id:null;if(r===0?(u=Q.getNextLayout(p.slice(0,1),null),t.photos=p.slice(0,1)):r===1&&p.length>=2?(u=Q.getNextLayout(p.slice(0,2),null),t.photos=p.slice(0,2)):(t.photos=[...p],u=Q.getNextLayout(p,g)),u){h.pushState("Change Layout");const m=t.imageShape;t.layout=u,m&&(t.imageShape=m),h.notify("pages",i.pages)}},d=p=>{if((!t.photos||t.photos.length===0)&&t.layout&&t.layout.slots){const g=h.state.assets?.photos||[];t.photos=t.layout.slots.filter(m=>m.photoId).map(m=>g.find(y=>y.id===m.photoId)).filter(m=>m)}let u=null;if(r===0&&(u=p.getLayoutIdForCount(1)),r===1&&(u=p.getLayoutIdForCount(2)),u){const g=p.regeneratePage(t,u);if(g){h.pushState("Change Layout");const m=[...h.state.pages],y=m.findIndex(w=>w.id===t.id);return y>-1&&(m[y]=g,h.state.pages=m,h.notify("pages",h.state.pages)),!0}}else if(r===2&&window.app.performTemplateRemix(t,p))return!0;return!1};if(t.templateId&&!a&&l){if(!l.config||l.currentTemplateId!==t.templateId){l.loadTemplate(t.templateId).then(()=>{d(l)||c()}).catch(p=>c());return}if(d(l))return}c()})}),e.querySelector("#prop-page-spacing").addEventListener("input",n=>{const r=parseInt(n.target.value,10),i=e.querySelector("#val-spacing");i&&(i.textContent=r+"px"),document.querySelectorAll("#canvas-container .photo-slot").forEach(l=>{l.style.boxSizing="border-box",l.style.padding=r>0?`${r}px`:"0"}),t.spacing=r,clearTimeout(window._spacingDebounce),window._spacingDebounce=setTimeout(()=>{h.pushState("Change Spacing"),h.notify("pages",h.state.pages)},400)}),e.querySelector("#prop-page-color").addEventListener("change",n=>{h.pushState("Change Color"),t.background=n.target.value,h.notify("pages",h.state.pages)});const s=e.querySelector("#btn-add-qr");s&&(s.addEventListener("click",()=>this.addQRToPage()),s.addEventListener("mouseenter",()=>{s.style.transform="scale(1.02)",s.style.boxShadow="0 4px 12px rgba(108, 52, 131, 0.4)"}),s.addEventListener("mouseleave",()=>{s.style.transform="",s.style.boxShadow=""}))}async addQRToPage(){const e=document.getElementById("qr-code-modal");if(e){e.style.display="flex";const t=e.querySelector("#qr-url-input");t&&(t.value="",setTimeout(()=>t.focus(),100))}}async _addQRWithUrl(e){if(!e||e==="https://")return;const{dataUrl:t,color:o}=await Lt(e,{size:256}),s=At(e,t,o,{x:80,y:78}),n=h.state,r=n.pages.findIndex(a=>a.id===n.activePageId);if(r===-1)return;h.pushState("Add QR Code");const i={...n.pages[r]};i.elements||(i.elements=[]),i.elements.push(s),n.pages[r]=i,n.selection=s.id,h.notify("pages",n.pages),console.log(`[QR] Added QR code for "${e}" (${o.name})`)}renderCoverProperties(e,t){const o=h.state,s=o.selection,n=ee.LAYOUTS,r=ee.FONTS,i=t.templateId||this.templateSidebar?.manager?.config?.templateId,a=ee.getTemplateDefaults(i);if(s==="cover-photo"||s==="cover-back-photo"){if(e.innerHTML=`
                <div class="panel-header">
                    <button class="btn-secondary btn-sm" id="btn-back-cover-props"><i class="fa-solid fa-arrow-left"></i> הגדרות כריכה</button>
                    <h3>${s==="cover-photo"?"תמונה קדמית":"תמונה אחורית"}</h3>
                </div>
             `,!(s==="cover-photo"?t.frontPhotoId:t.backPhotoId))e.innerHTML+='<div class="empty-state">לא נבחרה תמונה</div>';else{const I=document.createElement("div");I.className="prop-group",I.innerHTML='<button class="btn-secondary full-width text-danger" id="btn-remove-cover-photo">הסר תמונה</button>',e.appendChild(I),e.querySelector("#btn-remove-cover-photo").addEventListener("click",()=>{s==="cover-photo"?o.cover.frontPhotoId=null:o.cover.backPhotoId=null,h.notify("cover",o.cover),h.state.selection=null})}e.querySelector("#btn-back-cover-props").addEventListener("click",()=>{h.state.selection=null,h.notify("selection",null)});return}e.innerHTML="<h3>הגדרות כריכה</h3>";const l=document.createElement("div");l.className="prop-group",l.innerHTML=`<label>כותרת</label><input type="text" id="prop-cover-title" value="${t.title||""}" placeholder="${a.title}" style="text-align: right;" dir="rtl">`,e.appendChild(l);const c=document.createElement("div");c.className="prop-group",c.innerHTML=`<label>תת-כותרת</label><input type="text" id="prop-cover-sub" value="${t.subtitle||""}" placeholder="${a.subtitle}" style="text-align: right;" dir="rtl">`,e.appendChild(c);const d=document.createElement("div");d.className="prop-group",d.innerHTML=`<label>טקסט שדרה</label><input type="text" id="prop-cover-spine" value="${t.spineText||""}" placeholder="${t.title||a.spineText}" style="text-align: right;" dir="rtl">`,e.appendChild(d);const p=t.layout||a.layout,u=n.map(C=>`<option value="${C.id}" ${p===C.id?"selected":""} title="${C.description}">${C.label}</option>`).join(""),g=document.createElement("div");g.className="prop-group",g.innerHTML=`
            <label>פריסה</label>
            <select id="prop-cover-layout" class="full-width">
                ${u}
            </select>
        `,e.appendChild(g);const m=t.titleFont||a.titleFont,y=r.map(C=>{const I=m.includes(C.label.split(" ")[0])||m===C.family;return`<option value="${C.family}" ${I?"selected":""} style="font-family:${C.family}">${C.label}</option>`}).join(""),w=document.createElement("div");w.className="prop-group",w.innerHTML=`
            <label>גופן כותרת</label>
            <select id="prop-cover-title-font" class="full-width">
                ${y}
            </select>
        `,e.appendChild(w);const b=t.bodyFont||a.bodyFont,v=r.map(C=>{const I=b.includes(C.label.split(" ")[0])||b===C.family;return`<option value="${C.family}" ${I?"selected":""} style="font-family:${C.family}">${C.label}</option>`}).join(""),S=document.createElement("div");S.className="prop-group",S.innerHTML=`
            <label>גופן תת-כותרת</label>
            <select id="prop-cover-body-font" class="full-width">
                ${v}
            </select>
        `,e.appendChild(S);const f=document.createElement("div");f.className="prop-group",f.innerHTML=`
            <label>צבע רקע</label>
            <div style="display:flex; gap:10px;">
                <input type="color" id="prop-cover-color" value="${t.color||a.bgColor}" class="full-width" style="height:40px;">
                <button class="btn-secondary" id="btn-reset-theme" title="אפס לברירת מחדל"><i class="fa-solid fa-rotate-left"></i></button>
            </div>
        `,e.appendChild(f);const x=document.createElement("div");x.className="prop-group",x.innerHTML=`
            <label>צבע טקסט</label>
            <input type="color" id="prop-cover-text-color" value="${t.textColor||a.textColor}" class="full-width" style="height:40px;">
        `,e.appendChild(x),e.querySelector("#prop-cover-title").addEventListener("input",C=>{const I=C.target.value;h.state.cover.title=I,h.state.cover.textContent||(h.state.cover.textContent={}),h.state.cover.textContent.title=I,h.state.cover.textContent["cover-title"]=I;let E=[I,""];I.includes("&")?E=I.split("&"):I.includes(" ו")?E=I.split(" ו"):I.includes("ו-")&&(E=I.split("ו-")),h.state.cover.textContent.groomName=E[0].trim(),h.state.cover.textContent.brideName=E[1]?E[1].trim():"",this.templateSidebar&&this.templateSidebar.manager&&this.templateSidebar.manager.config&&this.templateSidebar.manager.config.pageLayouts.forEach(T=>{T.textElements&&T.textElements.forEach(k=>{(k.type==="title"||k.type==="locationTitle"||k.elementId==="destination")&&(h.state.cover.textContent[k.elementId]=I,document.querySelectorAll(`[data-selectable-id="${k.elementId}"]`).forEach(L=>{L&&(L.textContent=I)}))})}),document.querySelectorAll('[data-selectable-id="title"], [data-selectable-id="cover-title"]').forEach(T=>{T&&(T.textContent=I)})}),e.querySelector("#prop-cover-title").addEventListener("change",C=>{h.notify("cover",h.state.cover)}),e.querySelector("#prop-cover-sub").addEventListener("input",C=>{const I=C.target.value;h.state.cover.subtitle=I,h.state.cover.textContent||(h.state.cover.textContent={}),h.state.cover.textContent.date=I,h.state.cover.textContent.subtitle=I,h.state.cover.textContent["cover-subtitle"]=I,this.templateSidebar&&this.templateSidebar.manager&&this.templateSidebar.manager.config&&this.templateSidebar.manager.config.pageLayouts.forEach(E=>{E.textElements&&E.textElements.forEach(T=>{(T.type==="subtitle"||T.type==="date"||T.type==="body")&&(E.pageType==="cover"||E.pageType==="intro")&&(h.state.cover.textContent[T.elementId]=I,document.querySelectorAll(`[data-selectable-id="${T.elementId}"]`).forEach(k=>{k&&(k.textContent=I)}))})}),document.querySelectorAll('[data-selectable-id="subtitle"], [data-selectable-id="cover-subtitle"], [data-selectable-id="date"]').forEach(E=>{E&&(E.textContent=I)})}),e.querySelector("#prop-cover-sub").addEventListener("change",C=>{h.notify("cover",h.state.cover)}),e.querySelector("#prop-cover-spine").addEventListener("input",C=>{const I=C.target.value;h.state.cover.spineText=I,h.state.cover.textContent||(h.state.cover.textContent={}),h.state.cover.textContent.spine=I,document.querySelectorAll('[data-selectable-id="spine"], [data-selectable-id="cover-spine"]').forEach(E=>{E&&(E.textContent=I)})}),e.querySelector("#prop-cover-spine").addEventListener("change",C=>{h.notify("cover",h.state.cover)}),e.querySelector("#prop-cover-layout").addEventListener("change",C=>{h.state.cover={...h.state.cover,layout:C.target.value},h.notify("cover",h.state.cover)}),e.querySelector("#prop-cover-title-font").addEventListener("change",C=>{h.state.cover={...h.state.cover,titleFont:C.target.value,_userCustomTitleFont:!0},h.notify("cover",h.state.cover)}),e.querySelector("#prop-cover-body-font").addEventListener("change",C=>{h.state.cover={...h.state.cover,bodyFont:C.target.value,_userCustomBodyFont:!0},h.notify("cover",h.state.cover)}),e.querySelector("#prop-cover-color").addEventListener("input",C=>{h.state.cover={...h.state.cover,color:C.target.value,theme:null,_userCustomColor:!0}}),e.querySelector("#prop-cover-text-color").addEventListener("input",C=>{h.state.cover={...h.state.cover,textColor:C.target.value,_userCustomTextColor:!0}}),e.querySelector("#btn-reset-theme").addEventListener("click",()=>{const C=ee.getTemplateDefaults(i);h.state.cover={...h.state.cover,color:C.bgColor,textColor:C.textColor,titleFont:C.titleFont,bodyFont:C.bodyFont,layout:C.layout,theme:C.bgColor,textPositions:null,_userCustomColor:!1,_userCustomTextColor:!1,_userCustomTitleFont:!1,_userCustomBodyFont:!1},h.notify("cover",h.state.cover)})}renderTextProperties(e,t,o){e.innerHTML="";const s=document.createElement("h3");s.textContent="מאפייני טקסט",e.appendChild(s);const n=document.createElement("div");n.className="prop-group",n.innerHTML=`<label>תוכן</label><textarea id="prop-text-content" rows="3" style="text-align: right;" dir="rtl">${t.content}</textarea>`,e.appendChild(n);const r=document.createElement("div");r.className="prop-group",r.innerHTML=`<label>גודל: ${t.fontSize}px</label><input type="range" id="prop-text-size" min="12" max="120" value="${t.fontSize}">`,e.appendChild(r);const i=document.createElement("div");i.className="prop-group",i.innerHTML=`
            <label>יישור טקסט</label>
            <div style="display:flex; gap:10px; margin-top:5px; margin-bottom: 10px;" class="align-buttons">
                <button class="btn-secondary btn-sm align-btn" data-align="right" title="ימין" style="flex:1"><i class="fa-solid fa-align-right"></i></button>
                <button class="btn-secondary btn-sm align-btn" data-align="center" title="מרכז" style="flex:1"><i class="fa-solid fa-align-center"></i></button>
                <button class="btn-secondary btn-sm align-btn" data-align="left" title="שמאל" style="flex:1"><i class="fa-solid fa-align-left"></i></button>
            </div>
        `,e.appendChild(i),i.querySelectorAll(".align-btn").forEach(a=>{a.addEventListener("click",l=>{const c=l.currentTarget.dataset.align;t.textAlign=c;const d=document.querySelector(`[data-selectable-id="${t.id}"]`);d&&(d.style.textAlign=c,window.app&&window.app.moveableInstance&&window.app.moveableInstance.updateRect()),h.notify("pages",h.state.pages)})}),e.querySelector("#prop-text-content").addEventListener("input",a=>{t.content=a.target.value;const l=document.querySelector(`[data-selectable-id="${t.id}"]`);l&&(l.textContent=a.target.value)}),e.querySelector("#prop-text-content").addEventListener("change",a=>{h.notify("pages",h.state.pages)}),e.querySelector("#prop-text-size").addEventListener("input",a=>{const l=parseInt(a.target.value);t.fontSize=l,r.querySelector("label").textContent=`Size: ${l}px`;const c=document.querySelector(`[data-selectable-id="${t.id}"]`);c&&(c.style.fontSize=l+"px",window.app&&window.app.moveableInstance&&window.app.moveableInstance.updateRect())}),e.querySelector("#prop-text-size").addEventListener("change",a=>{h.notify("pages",h.state.pages)})}renderPhotoProperties(e,t,o){const s=o.layout.slots.find(m=>m.photoId===t);if(!s)return;e.innerHTML="<h3>מאפייני תמונה</h3>";const n=document.createElement("div");n.className="prop-group";const r=s.filter||"none";n.innerHTML=`
            <label>פילטר</label>
            <select id="prop-filter" class="full-width">
                <option value="none" ${r==="none"?"selected":""}>ללא</option>
                <option value="grayscale(100%)" ${r.includes("grayscale")?"selected":""}>שחור לבן</option>
                <option value="sepia(100%)" ${r.includes("sepia")?"selected":""}>ספיה</option>
                <option value="saturate(200%)" ${r.includes("saturate")?"selected":""}>חי (Vivid)</option>
                <option value="contrast(150%) brightness(90%) sepia(20%)" ${r.includes("contrast")?"selected":""}>דרמטי</option>
            </select>
        `,e.appendChild(n);const i=s.brightness||100,a=s.contrast||100;s.crop||(s.crop={panX:50,panY:50,zoom:1});const l=s.crop.zoom||1,c=s.crop.panX!==void 0?s.crop.panX:50,d=s.crop.panY!==void 0?s.crop.panY:50,p=(window.IMAGE_FRAMES||[]).map(m=>`<option value="${m.id}" ${s.frameId===m.id?"selected":""}>${m.name}</option>`).join(""),u=document.createElement("div");u.className="prop-group",u.innerHTML=`
            <label>זום (תקריב): <span id="val-zoom">${Math.round(l*100)}</span>%</label>
            <input type="range" id="prop-zoom" min="100" max="300" value="${Math.round(l*100)}">
            <label>הזזה (X): <span id="val-panx">${Math.round(c)}</span>%</label>
            <input type="range" id="prop-panx" min="0" max="100" value="${c}">
            <label>הזזה (Y): <span id="val-pany">${Math.round(d)}</span>%</label>
            <input type="range" id="prop-pany" min="0" max="100" value="${d}">
            <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
            <label>בהירות: <span id="val-bright">${i}</span>%</label>
            <input type="range" id="prop-brightness" min="0" max="200" value="${i}">
            <label>ניגודיות: <span id="val-bontrast">${a}</span>%</label>
            <input type="range" id="prop-contrast" min="0" max="200" value="${a}">
            ${p.length?`<hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
            <label>מסגרת</label>
            <select id="prop-frame" class="full-width">
                <option value="">ללא מסגרת</option>
                ${p}
            </select>`:""}
            <button class="btn-secondary btn-sm" id="btn-remove-photo" style="color:red; border-color:red; margin-top:15px; width:100%;">
                <i class="fa-solid fa-trash"></i> הסר תמונה
            </button>
        `,e.appendChild(u),e.querySelector("#prop-zoom").addEventListener("input",m=>{e.querySelector("#val-zoom").textContent=m.target.value,s.crop.zoom=m.target.value/100,h.notify("pages",h.state.pages)}),e.querySelector("#prop-panx").addEventListener("input",m=>{e.querySelector("#val-panx").textContent=m.target.value,s.crop.panX=parseFloat(m.target.value),h.notify("pages",h.state.pages)}),e.querySelector("#prop-pany").addEventListener("input",m=>{e.querySelector("#val-pany").textContent=m.target.value,s.crop.panY=parseFloat(m.target.value),h.notify("pages",h.state.pages)});const g=e.querySelector("#prop-frame");g&&g.addEventListener("change",m=>{s.frameId=m.target.value||null,h.notify("pages",h.state.pages)}),e.querySelector("#btn-remove-photo").addEventListener("click",()=>{if(confirm("להסיר את התמונה הזו?")){const m=o.photos?o.photos.findIndex(y=>y.id===t):-1;m>-1&&(o.photos.splice(m,1),o.layout=Q.generateLayout(o.photos),h.state.selection=null,h.notify("pages",h.state.pages))}})}renderCoverTextProperties(e,t,o){let s="";if(t.textContent&&t.textContent[o]!==void 0)s=t.textContent[o];else if(t.customLayout&&t.customLayout.textElements){const r=t.customLayout.textElements.find(i=>i.elementId===o);r&&(s=r.content||r.placeholder||"",s||(o==="title"||o==="childName"?s=t.title||"":(o==="date"||o==="subtitle")&&(s=t.subtitle||"")))}else o==="cover-title"?s=t.title||"":o==="cover-subtitle"&&(s=t.subtitle||"");if(!s){const r=document.querySelector(`[data-selectable-id="${o}"]`);r&&(s=r.textContent||"")}const n=t.textStyles?.[o]?.size||100;e.innerHTML=`
            <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h3>עריכת טקסט</h3>
                <button class="btn-secondary btn-sm" id="btn-back-to-cover" style="padding:4px 8px;" title="חזרה להגדרות כריכה"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
            <div style="padding:15px; display:flex; flex-direction:column; gap:15px; text-align: right;">
                <div>
                    <label>תוכן</label>
                    <textarea id="prop-inline-text" rows="3" class="full-width" dir="rtl" style="margin-top:5px; border-radius:4px; padding:5px;">${s||""}</textarea>
                </div>
                <div>
                    <label>קנה מידה (%)</label>
                    <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                        <input type="range" id="prop-inline-size" min="30" max="300" value="${n}" style="flex:1;">
                        <span id="val-inline-size" style="width:40px; text-align:left;">${n}%</span>
                    </div>
                    <div style="color: #888; font-size: 11px; margin-top: 5px;">
                        השתמש במחוון כדי לשנות את הגודל ביחס לגודל המקורי בתבנית.
                    </div>
                </div>
                <div>
                    <label>יישור טקסט</label>
                    <div style="display:flex; gap:10px; margin-top:5px; margin-bottom: 10px;" class="align-buttons">
                        <button class="btn-secondary btn-sm align-btn" data-align="right" title="ימין" style="flex:1"><i class="fa-solid fa-align-right"></i></button>
                        <button class="btn-secondary btn-sm align-btn" data-align="center" title="מרכז" style="flex:1"><i class="fa-solid fa-align-center"></i></button>
                        <button class="btn-secondary btn-sm align-btn" data-align="left" title="שמאל" style="flex:1"><i class="fa-solid fa-align-left"></i></button>
                    </div>
                </div>
            </div>
        `,e.querySelector("#btn-back-to-cover").addEventListener("click",()=>{h.state.selection=null}),e.querySelectorAll(".align-btn").forEach(r=>{r.addEventListener("click",i=>{const a=i.currentTarget.dataset.align;h.state.cover.textStyles||(h.state.cover.textStyles={}),h.state.cover.textStyles[o]||(h.state.cover.textStyles[o]={}),h.state.cover.textStyles[o].textAlign=a;const l=document.querySelector(`[data-selectable-id="${o}"]`);l&&(l.style.setProperty("text-align",a,"important"),window.app&&window.app.moveableInstance&&window.app.moveableInstance.updateRect()),h.notify("cover",h.state.cover)})}),e.querySelector("#prop-inline-text").addEventListener("input",r=>{h.state.cover.textContent||(h.state.cover.textContent={}),h.state.cover.textContent[o]=r.target.value;const i=document.querySelector(`[data-selectable-id="${o}"]`);i&&(i.textContent=r.target.value,window.app&&window.app.moveableInstance&&window.app.moveableInstance.updateRect()),clearTimeout(window._coverTextDebounce),window._coverTextDebounce=setTimeout(()=>{h.notify("cover",h.state.cover)},800)}),e.querySelector("#prop-inline-size").addEventListener("input",r=>{const i=r.target.value;e.querySelector("#val-inline-size").textContent=i+"%",h.state.cover.textStyles||(h.state.cover.textStyles={}),h.state.cover.textStyles[o]||(h.state.cover.textStyles[o]={}),h.state.cover.textStyles[o].size=i;const a=document.querySelector(`[data-selectable-id="${o}"]`);if(a){const l=i/100;a.style.transform&&a.style.transform.includes("translate")?a.style.transform=`translate(-50%, -50%) scale(${l})`:(a.style.transform=`scale(${l})`,a.style.transformOrigin="center center"),window.app&&window.app.moveableInstance&&window.app.moveableInstance.updateRect()}clearTimeout(window._coverSizeDebounce),window._coverSizeDebounce=setTimeout(()=>{h.notify("cover",h.state.cover)},500)})}applyPhotoStyles(e){let t=e.filter!=="none"?e.filter:"";e.brightness&&e.brightness!=100&&(t+=` brightness(${e.brightness}%)`),e.contrast&&e.contrast!=100&&(t+=` contrast(${e.contrast}%)`),e.computedFilter=t.trim()}renderAssetSidebar(){const e=document.getElementById("photo-library");if(!e)return;if(!this._googlePhotosBtnCreated){this._googlePhotosBtnCreated=!0;const l=document.createElement("button");l.className="btn-google-photos",l.id="btn-google-photos-persistent",l.innerHTML='<i class="fa-brands fa-google"></i> חבר Google Photos',l.style.cssText="width:100%;height:auto;align-self:start;grid-column:1/-1;padding:12px;margin-bottom:10px;background-color:#4285F4;color:white;border:none;border-radius:4px;font-weight:500;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;",l.addEventListener("click",async()=>{try{let c=G.getCurrentUser();if(!c)try{c=await G.signInWithGoogle()}catch(u){console.error("[App] Login failed:",u),alert("אנא התחבר כדי להשתמש ב-Google Photos.");return}l.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> מתחבר ל-Google Photos...',l.disabled=!0;let d=[];try{d=await be.openPicker()}finally{l.innerHTML='<i class="fa-brands fa-google"></i> חבר Google Photos',l.disabled=!1}if(!d||d.length===0){confirm(`לא נבחרו תמונות מ-Google Photos.
האם תרצה לנסות שוב? (במידה ולא, תוכל להעלות מהמחשב בלחצן ההעלאה הרגיל)`)&&l.click();return}h.state.assets.photos.length>0&&d.length>0&&window.confirm(`כבר יש תמונות בספרייה שלך.

לחץ אישור כדי להחליף אותן בבחירה החדשה.
לחץ ביטול כדי להוסיף (שמור קיים).`)&&(h.state.assets.photos=[]);const p=h.state.pages.some(u=>u.templateId==="family-roots-v1");p&&this.startNewProject(!1),h.state.assets.photos=[...h.state.assets.photos,...d],window.app&&(window.app._animateNextRender=!0,window.app.renderAssetSidebar(),h.notify("assets",h.state.assets),(p||h.state.pages.length===0)&&(h.state.pages.length===0&&h.addPage(),window.app.renderActivePage(),window.app.updateTimeline(h.state.pages,h.state.activePageId))),alert(`יובאו בהצלחה ${d.length} תמונות. גרור אותן לעמודים כדי להתחיל.`),Ie.batchAnalyzePhotos(d).then(u=>{let g=!1;h.state.assets.photos.forEach(m=>{u[m.id]&&(m.visionFocalPoint=u[m.id],g=!0)}),g&&window.app&&h.notify("pages",h.state.pages)})}catch(c){console.error(c),alert("שגיאת Google Photos: "+c)}}),this._persistedGoogleBtn=l}if(e.innerHTML="",e.appendChild(this._persistedGoogleBtn),!this._photoGridDelegated){this._photoGridDelegated=!0;const l=document.getElementById("photo-preview-tooltip");e.addEventListener("mouseover",c=>{const d=c.target.closest(".asset-item");if(!d)return;const p=d.querySelector(".btn-delete-asset");p&&(p.style.display="flex"),l&&d.dataset.photoSrc&&(l.innerHTML=`<img src="${d.dataset.photoSrc}" style="max-width:400px;max-height:400px;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.5);display:block;background:#fff;">`,l.style.display="block",l.style.top=c.clientY+10+"px",l.style.left=c.clientX+20+"px")}),e.addEventListener("mouseout",c=>{const d=c.target.closest(".asset-item");if(d&&!d.contains(c.relatedTarget)){const p=d.querySelector(".btn-delete-asset");p&&(p.style.display="none"),l&&(l.style.display="none")}}),e.addEventListener("mousemove",c=>{if(l&&l.style.display==="block"){let d=c.clientY+10,p=c.clientX+20;p+400>window.innerWidth&&(p=c.clientX-420),d+400>window.innerHeight&&(d=window.innerHeight-420),l.style.top=d+"px",l.style.left=p+"px"}}),e.addEventListener("click",c=>{const d=c.target.closest(".btn-delete-asset");if(!d)return;c.stopPropagation();const u=d.closest(".asset-item")?.dataset.photoId;if(u&&confirm("להסיר תמונה זו?")){const g=h.state.assets.photos.findIndex(m=>m.id===u);g>-1&&(h.state.assets.photos.splice(g,1),this.renderAssetSidebar(),h.notify("assets",h.state.assets))}}),e.addEventListener("dragstart",c=>{const d=c.target.closest(".asset-item");if(!d)return;const p=d.dataset.photoId;p&&(c.dataTransfer.setData("application/json",JSON.stringify({type:"photo",id:p})),c.dataTransfer.effectAllowed="copy")})}const t=this._animateNextRender===!0;t&&(this._animateNextRender=!1);const o=document.createDocumentFragment(),s=h.state.assets.photos;this._photoImageObserver||(this._photoImageObserver=new IntersectionObserver(l=>{for(const c of l)if(c.isIntersecting){const d=c.target,p=d.dataset.lazySrc;p&&(d.src=p,d.removeAttribute("data-lazy-src")),this._photoImageObserver.unobserve(d)}},{rootMargin:"100px"}));for(let l=0;l<s.length;l++){const c=s[l],d=document.createElement("div");if(d.className="asset-item",d.draggable=!0,d.style.position="relative",d.dataset.photoId=c.id,d.dataset.photoSrc=c.thumbnailUrl||c.url,t){d.classList.add("dealing"),d.style.setProperty("--deal-index",l);const g=450+l*60+50;setTimeout(()=>d.classList.remove("dealing"),g)}const p=document.createElement("img");p.draggable=!1,p.style.cssText="width:100%;height:100%;object-fit:cover;",l<20?p.src=c.thumbnailUrl||c.url:(p.dataset.lazySrc=c.thumbnailUrl||c.url,p.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90"><rect fill="%23333" width="90" height="90"/></svg>',this._photoImageObserver.observe(p)),d.appendChild(p);const u=document.createElement("button");u.className="btn-delete-asset",u.title="הסר תמונה",u.textContent="×",u.style.cssText="position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.6);color:white;border:none;cursor:pointer;display:none;align-items:center;justify-content:center;font-size:14px;line-height:1;",d.appendChild(u),o.appendChild(d)}e.appendChild(o);const n=document.getElementById("design-library");n&&(n.innerHTML="",window.BACKGROUND_TEXTURES&&window.BACKGROUND_TEXTURES.forEach(l=>{const c=document.createElement("div");c.className="asset-item",l.url.startsWith("http")||l.url.startsWith("assets")||l.url.startsWith("data:")?c.style.backgroundImage=`url("${l.url}")`:c.style.backgroundColor=l.theme?.colors?.primary||"#333",c.style.backgroundSize="cover",c.title=`${l.name}
Shift+לחיצה = החלה על כל העמודים`,c.addEventListener("click",d=>{if(d.shiftKey)h.setTheme(l.id);else{const p=h.state.pages.find(u=>u.id===h.state.activePageId);p&&(p.background=l.id,p.backgroundTextureId=l.id,h.notify("pages",h.state.pages))}}),n.appendChild(c)}));const r=document.getElementById("text-library");r&&(r.innerHTML="",window.TEXT_STYLES&&window.TEXT_STYLES.slice(0,20).forEach(l=>{const c=document.createElement("div");c.className="asset-item text-style-item",c.draggable=!0,c.style.display="flex",c.style.alignItems="center",c.style.justifyContent="center",(l.style.color==="#fff"||l.style.color==="#ffffff")&&(c.style.backgroundColor="#333");const d=document.createElement("span");d.textContent="Aa",Object.assign(d.style,l.style),c.appendChild(d),c.addEventListener("dragstart",p=>{p.dataTransfer.setData("application/json",JSON.stringify({type:"text",id:l.id}))}),r.appendChild(c)}));const i=document.getElementById("frame-library");i&&(i.innerHTML="",window.IMAGE_FRAMES&&window.IMAGE_FRAMES.forEach(l=>{try{const c=document.createElement("div");if(c.className="asset-item frame-item",c.style.border="1px solid #444",c.style.display="flex",c.style.alignItems="center",c.style.justifyContent="center",c.style.overflow="hidden",c.draggable=!0,c.addEventListener("dragstart",d=>{d.dataTransfer.setData("application/json",JSON.stringify({type:"frame",id:l.id}))}),l.svgGen||l.createSVG){let u="";if(l.createSVG)u=l.createSVG(300,300);else if(l.svgGen){const g=l.shapes&&l.shapes.length?l.shapes[0]:"rect";u=l.svgGen(300,300,l.color||"#ccc",g)}c.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 300 300">${u}</svg>`}else c.textContent=l.name;c.title=l.name,c.addEventListener("click",()=>{const d=h.state,p=d.pages.find(u=>u.id===d.activePageId);if(d.selection){const u=p.layout?.slots?.find(g=>(g.photoId||g.assetId||g.id||(g.photoIndex!==void 0?`index_${g.photoIndex}`:null))===d.selection);u&&(u.frameId=l.id,h.notify("pages",d.pages))}else p.imageFrameId=l.id,h.notify("pages",d.pages)}),i.appendChild(c)}catch(c){console.error(`Error rendering frame ${l.name}:`,c)}}));const a=document.getElementById("covers-library");a&&(a.innerHTML="",window.COVER_GALLERY&&window.COVER_GALLERY.forEach(l=>{const c=document.createElement("div");c.className="cover-gallery-item",c.style.cssText=`
                        aspect-ratio: 5/7;
                        border-radius: 8px;
                        overflow: hidden;
                        cursor: pointer;
                        position: relative;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        border: 2px solid transparent;
                    `;let d="";l.svg?d="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(l.svg):l.url?d=l.url:l.coverUrl&&(d=l.coverUrl),c.innerHTML=`
                        <img src="${d}" alt="${l.cityEn}" style="width:100%; height:100%; object-fit:cover; display:block;" loading="lazy" />
                        <div style="position:absolute; bottom:0; left:0; right:0; padding:6px 8px; background:linear-gradient(transparent, rgba(0,0,0,0.7)); color:#fff; font-size:11px; font-weight:600; text-align:center;">
                            ${l.cityEn}
                        </div>
                    `,c.addEventListener("mouseenter",()=>{c.style.borderColor="#38bdf8"}),c.addEventListener("mouseleave",()=>{c.style.borderColor="transparent"}),c.addEventListener("click",()=>{h.state.cover||(h.state.cover={}),h.state.cover.title=l.cityEn,h.state.cover.subtitle=new Date().getFullYear().toString(),h.state.cover.textColor=l.textColor,h.state.cover.color=l.bgColor,h.state.cover.theme=d,h.state.cover.background=d,h.state.cover._coverGalleryId=l.id,h.state.cover.frontPhotoId=null,l.backSvg?h.state.cover._backSvgDataUri="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(l.backSvg):(l.url||l.coverUrl)&&(h.state.cover._backSvgDataUri=null),h.state.cover.textContent||(h.state.cover.textContent={}),h.state.cover.textContent.title=l.cityEn,h.state.cover.textContent.date=new Date().getFullYear().toString(),h.state.cover.textContent.subtitle=new Date().getFullYear().toString(),h.state.viewMode="cover",h.notify("cover",h.state.cover),h.notify("viewMode","cover"),console.log("[CoverGallery] Applied cover:",l.id,l.cityEn)}),c.title=`${l.cityEn} (${l.countryEn})`,a.appendChild(c)}))}updateTimelineActiveState(e){const t=document.getElementById("page-timeline");if(!t)return;const o=this._lastTimelineActiveId!==e.activePageId||this._lastTimelineViewMode!==e.viewMode;this._lastTimelineActiveId=e.activePageId,this._lastTimelineViewMode=e.viewMode,Array.from(t.children).forEach(s=>{s.dataset.isCover==="true"?e.viewMode==="cover"?s.classList.add("active"):s.classList.remove("active"):s.dataset.pageId&&(e.viewMode!=="cover"&&s.dataset.pageId===e.activePageId?(s.classList.add("active"),o&&s.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"})):s.classList.remove("active"))})}updateTimeline(e,t){const o=document.getElementById("page-timeline");if(!o)return;const s=(e||[]).map(g=>g.id).join(","),r=`${h.state.viewMode==="cover"?"cover":""}|${s}`;if(this._lastTimelineHash===r){this.updateTimelineActiveState(h.state),this.updateActiveThumbnailOnly();return}this._lastTimelineHash=r,o.innerHTML="";const i=this.templateSidebar?.manager;let a=800,l=600;i&&i.config&&i.config.designSystem&&i.config.designSystem.canvas&&(a=i.config.designSystem.canvas.scaledWidth||i.config.designSystem.canvas.width||a,l=i.config.designSystem.canvas.scaledHeight||i.config.designSystem.canvas.height||l);const d=window.innerWidth<=768?80:110,p=(g,m,y)=>{const w=y/g,b=y/m;return Math.max(w,b)};if(this.timelineObserver||(this.timelineObserver=new IntersectionObserver((g,m)=>{g.forEach(y=>{if(y.isIntersecting){const w=y.target._lazyRender;if(w&&!y.target._rendered)try{w(),y.target._rendered=!0}catch(b){console.warn("[Timeline] Lazy render error:",b.message)}}})},{root:o,rootMargin:"400px",threshold:.01})),this.timelineObserver.disconnect(),h.state.viewMode==="cover"||h.state.cover){const g=document.createElement("div");g.className=`timeline-page cover ${h.state.viewMode==="cover"?"active":""}`,g.style.width=`${d}px`,g.style.height=`${d}px`,g.style.overflow="hidden",g.style.position="relative",g.dataset.isCover="true";const m=document.createElement("div");m.style.width="100%",m.style.height="100%",m.style.background="#e9ecef",g.appendChild(m);const y=p(a,l,d);g._lazyRender=()=>{m.remove();const w=document.createElement("div");w.style.width=`${a}px`,w.style.height=`${l}px`,w.style.position="absolute",w.style.top="50%",w.style.left="50%",w.style.transform=`translate(-50%, -50%) scale(${y})`,w.style.transformOrigin="center center",w.style.pointerEvents="none",w.style.background="#fff";const b=h.state.cover,v=i?.config||null;ee.render({cover:b,assets:h.state.assets,templateConfig:v,container:w,interactive:!1,thumbnail:!1}),g.appendChild(w)},g.onclick=()=>{h.state.viewMode!=="cover"&&(this._manualRenderLock=!0,h._isBatchUpdating=!0,h.state.viewMode="cover",h.state.activePageId=null,h._isBatchUpdating=!1,this._rafPending=!1,this._pendingUpdates=new Set,this.renderCoverWithTemplate(),this.updateTimelineActiveState(h.state),this.updatePropertiesPanel(h.state),requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._manualRenderLock=!1})}))},o.appendChild(g),this.timelineObserver.observe(g)}e.filter(g=>!(g.templateId==="cover"||g.id&&g.id.startsWith("page_cover_"))).forEach((g,m)=>{const y=document.createElement("div");y.className=`timeline-page ${g.id===t&&h.state.viewMode!=="cover"?"active":""}`,y.style.width=`${d}px`,y.style.height=`${d}px`,y.style.overflow="hidden",y.style.position="relative",y.dataset.pageId=g.id;const w=document.createElement("div");w.style.width="100%",w.style.height="100%",w.style.background="#e9ecef",w.className="timeline-skeleton-shimmer",y.appendChild(w);const b=p(a,l,d),v=g.id;y._lazyRender=()=>{try{w.parentElement&&w.remove();const f=h.state.pages.find(I=>I.id===v)||g,x=document.createElement("div");x.className="timeline-preview-wrapper",x.style.width=`${a}px`,x.style.height=`${l}px`,x.style.position="absolute",x.style.top="50%",x.style.left="50%",x.style.transform=`translate(-50%, -50%) scale(${b})`,x.style.transformOrigin="center center",x.style.pointerEvents="none",x.style.backgroundColor="transparent";let C=!1;if(f.templateId&&i&&i.config&&i.config.templateId===f.templateId){const I=this.getSpecializedRenderer(f.templateId,i.config);if(I&&f.rawLayoutId){const E=i.config.pageLayouts.find(T=>T.layoutId===f.rawLayoutId);if(E){const T=I.renderPage(E,f.photos||[],f.textContent||{},f.textPositions||{});T&&(T.style.width="100%",T.style.height="100%",x.appendChild(T),C=!0)}}}C||this.renderer.renderPageToContainer(f,h.state.assets,x),y.appendChild(x)}catch(f){console.warn("[Timeline] Render error for page",v?.substring(0,8),f.message)}};const S=document.createElement("div");S.className="page-num",S.textContent=m+1,y.appendChild(S),y.onclick=()=>{if(console.log("[TIMELINE CLICK] Page clicked:",g.id?.substring(0,12),"viewMode:",h.state.viewMode,"activePageId:",h.state.activePageId?.substring(0,12)),h.state.activePageId===g.id&&h.state.viewMode==="pages"){console.log("[TIMELINE CLICK] EARLY RETURN: same page already active");return}this._manualRenderLock=!0,h._isBatchUpdating=!0,h.state.activePageId=g.id,h.state.viewMode="pages",h._isBatchUpdating=!1,this._rafPending=!1,this._pendingUpdates=new Set,console.log("[TIMELINE CLICK] About to render. Looking for page:",h.state.activePageId?.substring(0,12),"in",h.state.pages.length,"pages");const f=h.state.pages.find(C=>C.id===h.state.activePageId);console.log("[TIMELINE CLICK] Page found:",!!f,f?{id:f.id?.substring(0,12),layout:typeof f.layout,hasSlots:!!f.layout?.slots}:"NOT FOUND"),this.renderActivePage();const x=document.getElementById("canvas-container");console.log("[TIMELINE CLICK] After render. Container children:",x?.children.length,"First child:",x?.firstElementChild?.className?.substring(0,40)),this.updateTimelineActiveState(h.state),this.updatePropertiesPanel(h.state),this.updateMoveable(h.state),requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._manualRenderLock=!1})})},o.appendChild(y),this.timelineObserver.observe(y)})}getSpecializedRenderer(e,t){return e&&t?new he(t):null}updateActivePagePreview(){h.state.pages&&this.updateActiveThumbnailOnly()}enterCropMode(e){if(!e)return;const t=e.closest(".shoso-page")||e.closest(".album-page");if(!t){console.log("[App] enterCropMode skipped: not on a page (likely cover)");return}const o=t.dataset.pageId,s=e.dataset.selectableId,n=h.state.pages.find(p=>p.id===o);if(n){const p=n.layout.slots.find(u=>u.photoId===s);p&&(p.manualCrop=!0)}this.currentCropSession&&this.commitCropMode(),console.log("[App] Entering crop mode for",s),document.querySelectorAll(".photo-slot").forEach(p=>p.classList.remove("crop-active")),e.classList.add("crop-active");const r=document.createElement("div");r.className="crop-instruction",r.innerHTML=`
            <i class="fas fa-arrows-alt" style="margin-left: 8px;"></i>
            <span>גרור לשינוי מיקום התמונה</span>
            <span style="margin: 0 6px; opacity: 0.6;">•</span>
            <span>לחץ בחוץ לסיום</span>
        `,r.style.cssText=`
            position: absolute;
            bottom: -40px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(37, 99, 235, 0.95);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 200;
            pointer-events: none;
            direction: rtl;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
            animation: cropInstructionPulse 2s ease-in-out infinite;
        `,e.appendChild(r);const i=document.createElement("div");if(i.className="crop-dim-overlay",i.style.cssText=`
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.4); z-index: 90; pointer-events: none;
        `,t.appendChild(i),e.style.zIndex="100",!document.getElementById("crop-mode-styles")){const p=document.createElement("style");p.id="crop-mode-styles",p.textContent=`
                @keyframes cropInstructionPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .photo-slot.crop-active {
                    box-shadow: 0 0 0 3px #2563eb, 0 0 0 6px rgba(37, 99, 235, 0.3) !important;
                    z-index: 100 !important;
                    cursor: move !important;
                }
                .photo-slot.crop-active img {
                    pointer-events: none;
                    transition: object-position 0.05s ease-out;
                }
            `,document.head.appendChild(p)}const a=e.querySelector("img");let l=50,c=50,d=1;if(n){const p=n.layout.slots.find(u=>u.photoId===s);p&&p.crop&&(l=p.crop.panX!==void 0?p.crop.panX:50,c=p.crop.panY!==void 0?p.crop.panY:50,d=p.crop.zoom||1)}this.currentCropSession={slotEl:e,pageId:o,slotId:s,imgEl:a,instructionEl:r,dimOverlay:i,panX:l,panY:c,zoom:d,startX:0,startY:0,startPanX:l,startPanY:c,isDragging:!1,hasModified:!1},a&&(a.style.objectPosition=`${l}% ${c}%`,a.style.transform=`scale(${d})`,a.style.transformOrigin="center center"),setTimeout(()=>{const p=u=>{!e.contains(u.target)&&this.currentCropSession&&!this.currentCropSession.isDragging&&(this.commitCropMode(),document.removeEventListener("mousedown",p),document.removeEventListener("touchstart",p))};this.currentCropSession.dismissHandler=p,document.addEventListener("mousedown",p),document.addEventListener("touchstart",p,{passive:!0})},200),e.addEventListener("mousedown",this.boundHandleCropDragStart),e.addEventListener("touchstart",this.boundHandleCropDragStart,{passive:!1}),e.style.cursor="move",e.draggable=!1}commitCropMode(){if(!this.currentCropSession)return;const{slotEl:e,pageId:t,slotId:o,dismissHandler:s,instructionEl:n,dimOverlay:r}=this.currentCropSession;console.log("[App] Committing crop mode for",o),e.classList.remove("crop-active"),e.style.cursor="",e.draggable=!0,n&&n.parentNode&&n.remove(),r&&r.parentNode&&r.remove(),e.removeEventListener("mousedown",this.boundHandleCropDragStart),e.removeEventListener("touchstart",this.boundHandleCropDragStart),s&&(document.removeEventListener("mousedown",s),document.removeEventListener("touchstart",s)),window.removeEventListener("mousemove",this.boundHandleCropDragMove),window.removeEventListener("mouseup",this.boundHandleCropDragEnd),window.removeEventListener("touchmove",this.boundHandleCropDragMove),window.removeEventListener("touchend",this.boundHandleCropDragEnd);const i=h.state.pages.find(a=>a.id===t);if(i){const a=i.layout.slots.find(l=>l.photoId===o);a&&(a.crop||(a.crop={}),a.crop.panX=this.currentCropSession.panX,a.crop.panY=this.currentCropSession.panY,a.crop.zoom=this.currentCropSession.zoom)}h.notify("pages",h.state.pages),this.currentCropSession=null}initializeCropState(e,t,o){}handleCropDragStart(e){if(!this.currentCropSession)return;e.stopPropagation(),e.preventDefault();const t=e.type==="touchstart",o=t?e.touches[0].clientX:e.clientX,s=t?e.touches[0].clientY:e.clientY;this.currentCropSession.hasModified||(h.pushState("Adjust Crop"),this.currentCropSession.hasModified=!0),this.currentCropSession.isDragging=!0,this.currentCropSession.startX=o,this.currentCropSession.startY=s,this.currentCropSession.startPanX=this.currentCropSession.panX,this.currentCropSession.startPanY=this.currentCropSession.panY,window.addEventListener("mousemove",this.boundHandleCropDragMove),window.addEventListener("mouseup",this.boundHandleCropDragEnd),window.addEventListener("touchmove",this.boundHandleCropDragMove,{passive:!1}),window.addEventListener("touchend",this.boundHandleCropDragEnd)}handleCropDragMove(e){if(!this.currentCropSession||!this.currentCropSession.isDragging)return;e.preventDefault();const t=e.type==="touchmove",o=t?e.touches[0].clientX:e.clientX,s=t?e.touches[0].clientY:e.clientY,{startX:n,startY:r,startPanX:i,startPanY:a,slotEl:l,imgEl:c}=this.currentCropSession,d=o-n,p=s-r,u=100/Math.max(l.clientWidth,1),g=100/Math.max(l.clientHeight,1);let m=Math.max(0,Math.min(100,i-d*u)),y=Math.max(0,Math.min(100,a-p*g));this.currentCropSession.panX=m,this.currentCropSession.panY=y,c&&(c.style.objectPosition=`${m}% ${y}%`)}handleCropDragEnd(e){if(!this.currentCropSession)return;this.currentCropSession.isDragging=!1,window.removeEventListener("mousemove",this.boundHandleCropDragMove),window.removeEventListener("mouseup",this.boundHandleCropDragEnd),window.removeEventListener("touchmove",this.boundHandleCropDragMove),window.removeEventListener("touchend",this.boundHandleCropDragEnd);const{pageId:t,slotId:o,panX:s,panY:n,zoom:r}=this.currentCropSession,i=h.state.pages.find(a=>a.id===t);if(i){const a=i.layout.slots.find(l=>l.photoId===o);a&&(a.crop||(a.crop={}),a.crop.panX=s,a.crop.panY=n,a.crop.zoom=r)}}enterCoverCropMode(e,t){if(!e)return;this.currentCropSession&&this.commitCropMode(),this.currentCoverCropSession&&this.commitCoverCropMode(),console.log("[App] Entering cover crop mode for",t),e.classList.add("crop-active");const o=document.createElement("div");if(o.className="crop-instruction",o.innerHTML=`
            <i class="fas fa-arrows-alt" style="margin-left: 8px;"></i>
            <span>גרור לשינוי מיקום התמונה</span>
            <span style="margin: 0 6px; opacity: 0.6;">•</span>
            <span>לחץ בחוץ לסיום</span>
        `,o.style.cssText=`
            position: absolute;
            bottom: -40px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(37, 99, 235, 0.95);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 200;
            pointer-events: none;
            direction: rtl;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
            animation: cropInstructionPulse 2s ease-in-out infinite;
        `,e.style.position=e.style.position||"relative",e.appendChild(o),!document.getElementById("crop-mode-styles")){const p=document.createElement("style");p.id="crop-mode-styles",p.textContent=`
                @keyframes cropInstructionPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .photo-slot.crop-active, .cover-photo-area.crop-active, .back-cover.crop-active {
                    box-shadow: 0 0 0 3px #2563eb, 0 0 0 6px rgba(37, 99, 235, 0.3) !important;
                    z-index: 100 !important;
                    cursor: move !important;
                }
                .photo-slot.crop-active img, .back-cover.crop-active img {
                    pointer-events: none;
                    transition: object-position 0.05s ease-out;
                }
            `,document.head.appendChild(p)}const r=(h.state.cover||{})[t==="front"?"frontCrop":"backCrop"]||{};let i=r.panX!==void 0?r.panX:50,a=r.panY!==void 0?r.panY:50;if(t==="front")e.style.backgroundPosition=`${i}% ${a}%`;else{const p=e.querySelector("img");p&&(p.style.objectPosition=`${i}% ${a}%`)}this.currentCoverCropSession={targetEl:e,coverSide:t,instructionEl:o,panX:i,panY:a,startX:0,startY:0,startPanX:i,startPanY:a,isDragging:!1,hasModified:!1};const l=p=>{p.stopPropagation(),p.preventDefault();const u=p.type==="touchstart",g=u?p.touches[0].clientX:p.clientX,m=u?p.touches[0].clientY:p.clientY;this.currentCoverCropSession.hasModified||(h.pushState("Adjust Cover Crop"),this.currentCoverCropSession.hasModified=!0),this.currentCoverCropSession.isDragging=!0,this.currentCoverCropSession.startX=g,this.currentCoverCropSession.startY=m,this.currentCoverCropSession.startPanX=this.currentCoverCropSession.panX,this.currentCoverCropSession.startPanY=this.currentCoverCropSession.panY,window.addEventListener("mousemove",c),window.addEventListener("mouseup",d),window.addEventListener("touchmove",c,{passive:!1}),window.addEventListener("touchend",d)},c=p=>{if(!this.currentCoverCropSession||!this.currentCoverCropSession.isDragging)return;p.preventDefault();const u=p.type==="touchmove",g=u?p.touches[0].clientX:p.clientX,m=u?p.touches[0].clientY:p.clientY,{startX:y,startY:w,startPanX:b,startPanY:v,targetEl:S,coverSide:f}=this.currentCoverCropSession,x=g-y,C=m-w,I=100/Math.max(S.clientWidth,1),E=100/Math.max(S.clientHeight,1);let T=Math.max(0,Math.min(100,b-x*I)),k=Math.max(0,Math.min(100,v-C*E));if(this.currentCoverCropSession.panX=T,this.currentCoverCropSession.panY=k,f==="front")S.style.backgroundPosition=`${T}% ${k}%`;else{const L=S.querySelector("img");L&&(L.style.objectPosition=`${T}% ${k}%`)}},d=()=>{if(!this.currentCoverCropSession)return;this.currentCoverCropSession.isDragging=!1,window.removeEventListener("mousemove",c),window.removeEventListener("mouseup",d),window.removeEventListener("touchmove",c),window.removeEventListener("touchend",d);const{panX:p,panY:u,coverSide:g}=this.currentCoverCropSession;h.state.cover||(h.state.cover={});const m=g==="front"?"frontCrop":"backCrop";h.state.cover[m]={panX:p,panY:u}};this.currentCoverCropSession._onDragStart=l,this.currentCoverCropSession._onDragMove=c,this.currentCoverCropSession._onDragEnd=d,e.addEventListener("mousedown",l),e.addEventListener("touchstart",l,{passive:!1}),e.style.cursor="move",setTimeout(()=>{const p=u=>{!e.contains(u.target)&&this.currentCoverCropSession&&!this.currentCoverCropSession.isDragging&&(this.commitCoverCropMode(),document.removeEventListener("mousedown",p),document.removeEventListener("touchstart",p))};this.currentCoverCropSession._dismissHandler=p,document.addEventListener("mousedown",p),document.addEventListener("touchstart",p,{passive:!0})},200)}commitCoverCropMode(){if(!this.currentCoverCropSession)return;const{targetEl:e,coverSide:t,instructionEl:o,_onDragStart:s,_onDragMove:n,_onDragEnd:r,_dismissHandler:i,panX:a,panY:l}=this.currentCoverCropSession;console.log("[App] Committing cover crop mode for",t),e.classList.remove("crop-active"),e.style.cursor="",o&&o.parentNode&&o.remove(),e.removeEventListener("mousedown",s),e.removeEventListener("touchstart",s),i&&(document.removeEventListener("mousedown",i),document.removeEventListener("touchstart",i)),window.removeEventListener("mousemove",n),window.removeEventListener("mouseup",r),window.removeEventListener("touchmove",n),window.removeEventListener("touchend",r),h.state.cover||(h.state.cover={});const c=t==="front"?"frontCrop":"backCrop";h.state.cover[c]={panX:a,panY:l},this.saveDebounced&&this.saveDebounced(h.state),this.currentCoverCropSession=null}applyViewerRestrictions(){console.log("[App] Applying viewer restrictions (Read-Only Mode)"),["btn-undo","btn-redo","btn-remix-layout","btn-add-photos-sidebar"].forEach(s=>{const n=document.getElementById(s);n&&(n.style.display="none")});const t=document.querySelector(".toolbar-group.center");if(t&&!document.getElementById("badge-readonly")){const s=document.createElement("span");s.id="badge-readonly",s.style.cssText="background: #fbbf24; color: #78350f; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 0.85rem; margin-right: 15px; display: inline-flex; align-items: center; gap: 5px;",s.innerHTML='<i class="fa-solid fa-eye"></i> צפייה בלבד',t.appendChild(s)}this.moveableInstance&&(this.moveableInstance.draggable=!1,this.moveableInstance.resizable=!1,this.moveableInstance.rotatable=!1),document.getElementById("sidebar-left").style.pointerEvents="none",document.getElementById("sidebar-left").style.opacity="0.5";let o=document.getElementById("save-status-indicator");o&&(o.textContent="מצב קריאה")}removeViewerRestrictions(){const e=document.getElementById("badge-readonly");e&&e.remove(),["btn-undo","btn-redo","btn-remix-layout","btn-add-photos-sidebar"].forEach(o=>{const s=document.getElementById(o);s&&(s.style.display="")}),document.getElementById("sidebar-left").style.pointerEvents="",document.getElementById("sidebar-left").style.opacity="1",this.moveableInstance&&(this.moveableInstance.draggable=!0,this.moveableInstance.resizable=!0,this.moveableInstance.rotatable=!0)}openShareModal(){if(!h.state.user){alert("עליך להתחבר כדי לשתף את האלבום.");return}if(!U.currentProjectId){alert("יש לשמור את הפרויקט לפני שיתופו. הוסף תמונות או דפים תחילה.");return}const e=document.getElementById("share-modal"),t=document.getElementById("share-toggle-public"),o=document.getElementById("share-settings-panel"),s=document.getElementById("share-role-select"),n=document.getElementById("share-allow-reshare"),r=document.getElementById("share-link-input"),i=document.getElementById("btn-copy-share-link"),a=document.getElementById("btn-save-share-settings"),l=document.getElementById("share-not-saved-notice");l.style.display="none",h.state.user.uid,U.currentOwner||U.currentShareSettings?.owner;const c=U.currentRole||"owner",d=U.currentShareSettings||{};if(c!=="owner"&&!(c==="editor"&&d.allowEditorsToShare)){alert("אין לך הרשאה לשתף את האלבום הזה.");return}t.checked=d.isPublic||!1,o.style.display=t.checked?"block":"none",s.value=d.publicRole||"viewer",n.checked=d.allowEditorsToShare||!1;const p=u=>{const g=window.location.origin,m=window.location.pathname;return`${g}${m}?projectId=${U.currentProjectId}&shareToken=${u||""}`};r.value=p(d.shareToken),t.onchange=u=>{o.style.display=u.target.checked?"block":"none"},i.onclick=async()=>{t.checked||(t.checked=!0,o.style.display="block",await a.onclick()),navigator.clipboard.writeText(r.value).then(()=>{const u=i.querySelector("i");if(u){const g=u.className;u.className="fa-solid fa-check",setTimeout(()=>u.className=g,2e3)}})},a.onclick=async()=>{a.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> שומר...',a.disabled=!0;try{const u={isPublic:t.checked,publicRole:s.value,allowEditorsToShare:n.checked},g=await U.updateShareSettings(U.currentProjectId,u);r.value=p(g.shareSettings.shareToken),a.innerHTML='<i class="fa-solid fa-check"></i> נשמר!',setTimeout(()=>{a.innerHTML="שמור הגדרות",a.disabled=!1},2e3)}catch(u){console.error("Failed to save share settings",u),alert("שגיאה בשמירת הגדרות שיתוף: "+u.message),a.innerHTML="שמור הגדרות",a.disabled=!1}},e.style.display="flex"}}window.addEventListener("DOMContentLoaded",()=>{window.app=new Rt});window.downloadPdfOnly=async()=>{console.log("PDF download triggered externally.")};window.demo_createMockAlbum=()=>{console.log("Creating Mock Album...");const P=[],e=window.BACKGROUND_TEXTURES?window.BACKGROUND_TEXTURES.map(s=>s.id):[],t=window.PAGE_FRAMES?window.PAGE_FRAMES.map(s=>s.id):[],o=h.state.assets.photos;if(!o||o.length===0){console.error("No photo assets available!");return}for(let s=0;s<10;s++){const n=crypto.randomUUID(),r=Math.floor(Math.random()*3)+1,i=[];for(let d=0;d<r;d++){const p=o[Math.floor(Math.random()*o.length)];i.push(p)}let a=null;window.app&&window.app.layoutEngine?a=window.app.layoutEngine.generateLayout(i):a={slots:[]};const l=e.length>0?e[Math.floor(Math.random()*e.length)]:null,c=t.length>0&&Math.random()>.7?t[Math.floor(Math.random()*t.length)]:null;P.push({id:n,backgroundId:l,background:l,frameId:c,photos:i,layout:a,elements:[{id:crypto.randomUUID(),type:"text",content:`Page ${s+1}`,x:50,y:92,styleId:"body-small",fontSize:16,fontFamily:"Inter",color:"#000000",align:"center"}]})}h.state.pages=P,h.state.cover||(h.state.cover={}),h.state.cover.title="My Travels 2026",h.state.cover.subtitle="A Journey Through Code",h.state.cover.layout="full-bleed",o.length>0&&(h.state.cover.frontPhotoId=o[0].id),h.state.activePageId=P[0].id,h.state.viewMode="pages",console.log("Mock Album Created with 10 pages."),h.notify("pages",P)};export{Ce as R,pt as U,he as a,se as p};
