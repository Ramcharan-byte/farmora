/* ================================
   FARMORA MAIN JAVASCRIPT
================================ */


/* Smooth scrolling */

document.querySelectorAll('a[href^="#"]').forEach(function(link) {

    link.addEventListener("click", function(event) {

        const targetId = this.getAttribute("href");

        if (targetId === "#") {
            return;
        }

        const target = document.querySelector(targetId);

        if (target) {

            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth"
            });

        }

    });

});


/* Category cards */

document.querySelectorAll(".category-card").forEach(function(card) {

    card.addEventListener("click", function() {

        const title = card.querySelector("h3");

        if (title) {

            console.log(
                "Farmora category selected:",
                title.textContent
            );

        }

    });

});


/* Simple welcome message */

console.log("🌱 Farmora website loaded successfully!");
console.log("From Farm to You.");