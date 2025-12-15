(function(){
  const t=document.querySelector(".page-transition");
  const nav=u=>{t.classList.add("is-on");setTimeout(()=>location.href=u,180)};

  addEventListener("keydown",e=>{
    const k=e.key.toLowerCase();
    if(k==="r")nav("./real-estate.html");
    if(k==="i")nav("./reels-interviews.html");
    if(k==="p")nav("./projets-independants.html");
    if(k==="h")nav("./index.html");
  });

  document.addEventListener("click",e=>{
    const a=e.target.closest("a");
    if(a&&a.getAttribute("href")?.endsWith(".html")){
      e.preventDefault();nav(a.getAttribute("href"));
    }
  });

  const d=document.querySelector(".cursor-dot");
  let x=innerWidth/2,y=innerHeight/2,tx=x,ty=y;
  addEventListener("mousemove",e=>{tx=e.clientX;ty=e.clientY});
  (function loop(){x+=(tx-x)*.2;y+=(ty-y)*.2;d.style.transform=`translate(${x}px,${y}px)`;requestAnimationFrame(loop)})();
})();
