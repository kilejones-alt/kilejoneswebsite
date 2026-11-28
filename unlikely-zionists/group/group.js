(() => {
  'use strict';
  const config=window.UnlikelyZionistsCommunity;
  const endpoint=config?.endpoint;
  const form=document.getElementById('group-form'),submit=document.getElementById('group-submit');
  const status=document.getElementById('group-status'),room=document.getElementById('group-room');
  const availability=document.getElementById('availability'),value=document.getElementById('availability-value');
  const session=crypto.randomUUID();
  let busy=false,joined=false,pollTimer=null;
  const configured=()=>/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint||'');
  const sync=()=>{submit.disabled=busy||!form.checkValidity();};
  async function request(params){
    if(!configured())throw new Error('unavailable');
    const response=await fetch(endpoint+'?'+new URLSearchParams(params),{
      credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(15000)
    });
    const result=await response.json();
    if(!response.ok||!result?.ok)throw new Error('unavailable');
    return result;
  }
  async function refresh(){
    clearTimeout(pollTimer);
    if(!configured())return;
    try{
      const result=await request({action:'presence',...(joined?{session}: {})});
      if(!Number.isInteger(result.available)||result.available<0)throw new Error('invalid');
      availability.hidden=false;availability.dataset.active=String(result.available>0);
      value.textContent=String(result.available);
    }catch{availability.hidden=true;value.textContent='';}
    pollTimer=setTimeout(refresh,30000);
  }
  async function confirmReceipt(reference){
    // A relay acceptance is not proof that the private Sheet has saved a row.
    for(let attempt=0;attempt<10;attempt++){
      const receipt=await request({action:'receipt',reference});
      if(receipt.saved)return;
      await new Promise(resolve=>setTimeout(resolve,1500));
    }
    throw new Error('unconfirmed');
  }
  form.addEventListener('input',sync);form.addEventListener('change',sync);sync();
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!form.reportValidity())return;
    if(!configured()){status.textContent='We could not confirm delivery. Please wait before trying again, or use the email link below.';return;}
    busy=true;sync();form.setAttribute('aria-busy','true');status.textContent='Sending…';
    try{
      const receipt=await window.UnlikelyZionistsMail.send(form,'Group request');
      await confirmReceipt(receipt.id);
      joined=true;form.hidden=true;room.hidden=false;status.textContent='';form.reset();
      document.getElementById('group-call').href=config.room;
      document.getElementById('group-call').focus();await refresh();
    }catch(error){console.warn('Group submission was not confirmed:',error.message);status.textContent='We could not confirm delivery. Please wait before trying again, or use the email link below.';}
    finally{busy=false;form.removeAttribute('aria-busy');sync();}
  });
  document.getElementById('group-back').addEventListener('click',async()=>{
    joined=false;room.hidden=true;form.hidden=false;
    try{await request({action:'presence',session,leave:'1'});}catch{}
    document.getElementById('group-name').focus();refresh();
  });
  window.addEventListener('pagehide',()=>{clearTimeout(pollTimer);});
  window.addEventListener('pageshow',()=>{refresh();});
})();
