/* Animation of the same moving parts used by the island's creatures. */
(function(root){
  function create(model){
    const parts=[];model.traverse(node=>{const rig=node.userData.galleryMotion;if(rig)parts.push({node,rig,x:node.rotation.x,y:node.rotation.y,z:node.rotation.z});});
    const baseY=model.position.y,baseRotY=model.rotation.y;
    return function(pose,time){
      const moving=pose!=='Still',speed=pose==='Run'?12:pose==='Walk'?6:pose==='Crawl'?8:pose==='Fly'?12:6;
      for(const p of parts){const n=p.node,r=p.rig;n.rotation.set(p.x,p.y,p.z);
        if(!moving)continue;
        if(r.role==='leg'){if(r.side)n.rotation.z=p.z+Math.sin(time*speed+r.index*1.3)*.5;else n.rotation.x=p.x+Math.sin(time*speed)*(r.index===0||r.index===3?1:-1)*(pose==='Run'?.9:.55);}
        else if(r.role==='wing'&&pose==='Fly')n.rotation.z=p.z+r.sign*Math.sin(time*speed)*.7;
        else if(r.role==='tail'&&pose==='Swim')n.rotation.y=p.y+Math.sin(time*speed)*.35;
      }
      model.position.y=baseY+(moving&&(pose==='Fly'||pose==='Crawl')?Math.sin(time*speed)*.015:0);
      model.rotation.y=baseRotY+(pose==='Swim'?Math.sin(time*speed)*.08:0);
    };
  }
  const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GalleryMotion=api;
})(typeof window!=='undefined'?window:globalThis);
