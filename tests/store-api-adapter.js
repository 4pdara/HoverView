/* Capture/test harness only. Never included in the upload package. */
(() => {
  if (parent !== window && parent.HoverViewCaptureAPI) {
    window.chrome = parent.HoverViewCaptureAPI;
    return;
  }
  const settingsScene = new URLSearchParams(location.search).get('scene') === 'settings';
  const settings = {delay:settingsScene?350:0,maxSize:settingsScene?80:55,enabled:true,theme:'dark'}, listeners = [];
  window.HoverViewCaptureAPI = window.chrome = {
    storage: {
      local: {get:async defaults=>({...defaults,...settings}),set:async patch=>{
        const changes = Object.fromEntries(Object.entries(patch).map(([key,value])=>[key,{oldValue:settings[key],newValue:value}]));
        Object.assign(settings,patch);listeners.forEach(fn=>fn(changes,'local'));
      }},onChanged:{addListener:fn=>listeners.push(fn)}
    },
    tabs:{query:async()=>[{url:'https://gallery.hoverview.example/'}]}
  };
})();
