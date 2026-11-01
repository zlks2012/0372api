function c(e){const n=String(e);if(!/^-?\d+(?:\.\d+)?$/.test(n))return n;const[r,i=""]=n.split("."),t=i.replace(/0+$/,"");return r.replace(/\B(?=(\d{3})+(?!\d))/g,",")+(t?`.${t}`:"")}export{c as f};
