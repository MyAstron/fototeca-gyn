/* Capa AJAX base (jQuery): la única puerta para pedir archivos y endpoints */
(function(){
  const E=window.__EMBED,has=u=>E&&E.files&&u in E.files;   /* E solo existe en la vista previa */
  const done=v=>jQuery.Deferred().resolve(v).promise();
  const request=(url,type)=>has(url)?done(type==="json"?JSON.parse(E.files[url]):E.files[url])
    :jQuery.ajax({url,dataType:type||"text",cache:true}).then(d=>d);
  App.http={
    request,
    json:u=>request(u,"json"),
    html:u=>request(u,"html"),
    css:url=>document.querySelector('style[data-src="'+url+'"]')?done():
      request(url,"text").then(css=>{jQuery("<style>").attr("data-src",url).text(css).appendTo("head")}),
    script:url=>has(url)?(jQuery.globalEval(E.files[url]),done()):jQuery.ajax({url,dataType:"script",cache:true}).then(()=>{})
  };
})();
