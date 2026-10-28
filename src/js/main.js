/* Arranque: pide por AJAX las vistas y los datos, y entrega el resultado a los módulos de interfaz */
jQuery(function(){
  Promise.all([App.api.view("header"),App.api.view("home")]).then(function(v){
    jQuery("#app-header").html(v[0]);jQuery("#app-main").html(v[1]);
    App.site.init();
    App.api.site().then(App.site.render,function(){});
    App.api.obras().then(App.gallery.render,App.gallery.error);
  }).catch(function(){jQuery("#app-main").text("No se pudo cargar la página.")});
});
