// --- MOBILE MENU ---

const hamburger = document.getElementById("hamburger");
const menu = document.getElementById("menu");
const overlay = document.getElementById("overlay");
const menuLinks = document.querySelectorAll(".menu a");

function toggleMenu() {
  hamburger.classList.toggle("active");
  menu.classList.toggle("active");
  overlay.classList.toggle("active");
}

hamburger.addEventListener("click", toggleMenu);
overlay.addEventListener("click", toggleMenu);

menuLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (menu.classList.contains("active")) {
      toggleMenu();
    }
  });
});
