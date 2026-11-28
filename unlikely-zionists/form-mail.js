/* Private submission storage and email delivery. No presentation or editorial changes. */
(() => {
  'use strict';
  const endpoint='https://formsubmit.co/ajax/c079591d84c865a3c180911463dd3fd5';
  const website='https://kilejones.com/unlikely-zionists/';
  const failure='We could not confirm delivery. Please wait before trying again, or use the email link below.';
  function build(form,kind){
    const source=new FormData(form),body=new FormData();
    const reference=crypto.randomUUID();
    const fields=new Map();
    for(const [key,value] of source){
      if(value instanceof Blob)continue;
      const values=fields.get(key)||[];values.push(String(value));fields.set(key,values);
    }
    for(const [key,values] of fields)body.set(key,values.join(', '));
    body.set('reference',reference);
    body.set('submission_type',kind);
    body.set('_subject',`The Unlikely Zionists — ${kind} — ${reference}`);
    body.set('_template','table');
    body.set('_url',website);
    body.set('_honey',String(source.get('website')||''));
    const replyTo=String(source.get('private_email')||source.get('email')||'').trim();
    if(replyTo)body.set('_replyto',replyTo);
    const files=source.getAll('photos').filter(value=>value instanceof Blob&&value.size>0);
    if(files.length>5||files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>6*1024*1024)||files.reduce((sum,file)=>sum+file.size,0)>10*1024*1024)throw new Error('Choose up to five JPG, PNG, or WebP images: 6 MB per image and 10 MB in total.');
    files.forEach((file,index)=>body.append(index?'attachment'+(index+1):'attachment',file,file.name));
    return {body,reference};
  }
  async function save(body){
    const endpoint=window.UnlikelyZionistsCommunity?.endpoint;
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint||''))return false;
    const fields={};
    const photos=[];
    for(const [key,value] of body){
      if(value instanceof Blob){if(value.size)photos.push(value.name||key);}
      else fields[key]=String(value);
    }
    if(photos.length)fields.photograph_names=photos.join(', ');
    let response,result;
    try{
      // A simple cross-origin POST avoids a preflight; the JSON response confirms the write.
      response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({form_data:fields}),credentials:'omit',signal:AbortSignal.timeout(30000)});
      result=await response.json();
    }catch{throw new Error(failure);}
    if(!response.ok||result?.ok!==true)throw new Error(failure);
    return true;
  }
  async function send(form,kind){
    if(!['https:','http:'].includes(location.protocol))throw new Error(failure);
    const {body,reference}=build(form,kind);
    // File delivery uses the provider's documented native multipart route.
    // Its AJAX route accepts text but drops file uploads.
    if([...body.values()].some(value=>value instanceof Blob&&value.size>0)){
      await save(body);
      const transfer=document.createElement('form');
      transfer.method='POST';transfer.action=endpoint.replace('/ajax/','/');
      transfer.enctype='multipart/form-data';transfer.hidden=true;
      for(const [name,value] of body){
        const field=document.createElement('input');field.name=name;
        if(value instanceof Blob){
          field.type='file';const files=new DataTransfer();files.items.add(value);field.files=files.files;
        }else{field.type='hidden';field.value=value;}
        transfer.appendChild(field);
      }
      document.body.appendChild(transfer);
      HTMLFormElement.prototype.submit.call(transfer);
      return new Promise(()=>{});
    }
    let response;
    try{
      response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(Object.fromEntries(body)),credentials:'omit',signal:AbortSignal.timeout(90000)});
    }catch{throw new Error(failure);}
    const result=await response.json().catch(()=>null);
    if(!response.ok||!result||!['true',true].includes(result.success)){console.warn('Email relay declined delivery:',result?.message||response.status);throw new Error(failure);}
    const stored=await save(body);
    return {received:true,id:reference,stored};
  }
  window.UnlikelyZionistsMail=Object.freeze({send,build});
})();

