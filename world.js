export async function initWorld(){
 console.log('World init');
 await new Promise(r=>setTimeout(r,1500));
}