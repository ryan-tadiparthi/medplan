function toggleMenu(){
  document.getElementById('navLinks').classList.toggle('active');
}

document.querySelectorAll('.nav-links a').forEach(link=>{
  link.addEventListener('click',()=>{
    document.getElementById('navLinks').classList.remove('active');
  });
});