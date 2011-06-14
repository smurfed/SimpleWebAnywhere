
var old_open = window.open;
window.open = function() {}
var navLoaded = false;
function navigationLoad() {
  navLoaded = true;
}

var returning = false;

if(window.addEventListener) {
  window.addEventListener('focus', focus_webanywhere, false);
  window.addEventListener('blur', blur_webanywhere, true);
  window.addEventListener('unload', unload_webanywhere, false);
} else if(window.attachEvent) {
  window.attachEvent('onfocus', focus_webanywhere);
  window.attachEvent('onblur', blur_webanywhere);
  window.attachEvent('onunload', unload_webanywhere);
}
function announce_in_focus() {
  if(returning && navLoaded) {
    if(window.navigation_frame) {
      window.navigation_frame.prefetch("Web Anywhere is now in focus.", true, false);
      window.navigation_frame.WA.Interface.focusLocation();
    } else {
      setTimeout("announce_in_focus", 1000);
    }
  }
}
function focus_webanywhere() {
  //announce_in_focus();
  returning = false;
}

function blur_webanywhere() {
  //window.navigation_frame.prefetch("Another window has tried to replace the focus of Web Anywhere.  If the system is not responding, please try hitting alt-tab to return to this window.", true, false);
  //window.navigation_frame.focus();
  returning = true;
}

function unload_webanywhere() {
  //window.navigation_frame.prefetch("Web Anywhere is being unloaded.  If the system stops responding, try pressing either backspace or alt + left arrow to return to this page.", true, false);
  //returning = true;
}

// Called onload and onresize to resize the 
function resizeContentFrame() {

  var newHeight = WA.Utils.contentWidthHeight(top)[1] -
                    (document.getElementById('wa_navigator').offsetHeight);

  document.getElementById('content_frame').style.height = newHeight + 'px';
  document.getElementById('wa_iframe_div').style.height = newHeight + 'px';
}
