/* DELYART — le bouton WhatsApp flottant se masque quand la section Contact est visible */
(()=>{
const wa=document.querySelector('.wa-float'),end=document.querySelector('#contact');
if(!wa||!end||!('IntersectionObserver' in window))return;
new IntersectionObserver(es=>es.forEach(e=>wa.classList.toggle('hide',e.isIntersecting)),{threshold:.15}).observe(end);
})();
