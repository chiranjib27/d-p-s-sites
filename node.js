// Remove preloader (Disabled as we use the minigame intro instead)
// window.addEventListener('load', () => {
//     const preloader = document.getElementById('preloader');
//     setTimeout(() => {
//         preloader.style.opacity = '0';
//         setTimeout(() => {
//             preloader.style.display = 'none';
//         }, 500);
//     }, 1500); // Show it a bit for effect
// });

// --- SWAP PUZZLE INTRO LOGIC ---
const PUZZLE_SIZE = 2;
let boardState = [0, 1, 2, 3];
let selectedIndex = -1;

function initPuzzle() {
    const board = document.getElementById('puzzle-board');
    if (!board) return;

    // A simple solvable shuffle (2x2)
    boardState = [1, 3, 0, 2];
    selectedIndex = -1;

    renderPuzzle();
}

function selectPiece(index) {
    if (selectedIndex === -1) {
        // Select first piece
        selectedIndex = index;
    } else {
        // Swap pieces
        if (selectedIndex !== index) {
            const temp = boardState[selectedIndex];
            boardState[selectedIndex] = boardState[index];
            boardState[index] = temp;
        }
        selectedIndex = -1;
        checkWin();
    }

    renderPuzzle();
}

function renderPuzzle() {
    const board = document.getElementById('puzzle-board');
    if (!board) return;
    board.innerHTML = '';

    boardState.forEach((pieceVal, index) => {
        const div = document.createElement('div');
        div.className = `puzzle-piece piece-${pieceVal}`;
        if (index === selectedIndex) {
            div.classList.add('selected');
        }
        div.onclick = () => selectPiece(index);
        board.appendChild(div);
    });
}

function checkWin() {
    let won = true;
    for (let i = 0; i < boardState.length; i++) {
        if (boardState[i] !== i) won = false;
    }
    if (won) {
        setTimeout(() => {
            skipPuzzle();
        }, 300);
    }
}

window.skipPuzzle = function () {
    // Remember that we passed the puzzle
    sessionStorage.setItem('puzzleSolved', 'true');
    const intro = document.getElementById('intro-game');
    const mainContent = document.getElementById('main-content');
    if (intro && mainContent) {
        intro.style.opacity = '0';
        setTimeout(() => {
            intro.style.display = 'none';
            mainContent.style.display = 'block';
            void mainContent.offsetWidth;
            mainContent.style.opacity = '1';

            if (typeof AOS !== 'undefined') {
                AOS.init({ once: true, offset: 100, duration: 1200 });
            }
        }, 1000);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const intro = document.getElementById('intro-game');
    const mainContent = document.getElementById('main-content');

    if (sessionStorage.getItem('puzzleSolved') === 'true') {
        // Skip puzzle entirely if returning
        if (intro) intro.style.display = 'none';
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.opacity = '1';
        }
        if (typeof AOS !== 'undefined') {
            AOS.init({ once: true, offset: 100, duration: 800 });
        }
    } else if (intro) {
        initPuzzle();
    }
});
// --- END SLIDING PUZZLE LOGIC ---

// Initialize Animate On Scroll (AOS) wrapper - now handled after minigame win
// Note: We are using the AOS library imported in the HTML
AOS.init({
    once: true, // whether animation should happen only once - while scrolling down
    offset: 100, // offset (in px) from the original trigger point
    duration: 800, // values from 0 to 3000, with step 50ms
});

// Navbar scroll effect
const nav = document.querySelector('nav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});

// Mobile menu toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = hamburger.querySelector('i');
        if (navLinks.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        if (navLinks && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active'); // Close mobile menu if open
            const icon = hamburger.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }

        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// --- DYNAMIC VIDEO LOGIC (LOCAL FILES & SAVING) ---
let savedVideos = JSON.parse(localStorage.getItem('weddingVideos') || '[]');

function renderVideos() {
    const grid = document.getElementById('video-grid');
    if (!grid) return;
    grid.innerHTML = '';

    savedVideos.forEach((videoDataUrl, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'video-item';

        wrapper.innerHTML = `
            <video width="100%" height="250" controls style="object-fit: contain; background: #000;">
                <source src="${videoDataUrl}" type="video/mp4">
                Your browser does not support the video element.
            </video>
            <button class="delete-video-btn" onclick="deleteVideo(${index})"><i class="fas fa-trash"></i></button>
        `;
        grid.appendChild(wrapper);
    });
}

function processVideoFile(file) {
    if (!file) return;

    // Check if it's a video file
    if (!file.type.startsWith('video/')) {
        alert("Please select a valid video file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const videoDataUrl = e.target.result;

        try {
            // Check for LocalStorage 5MB quota limits before saving
            savedVideos.push(videoDataUrl);
            localStorage.setItem('weddingVideos', JSON.stringify(savedVideos));
            renderVideos();
        } catch (error) {
            console.error(error);
            alert("Storage limit exceeded! Local storage only supports small video files. For larger videos, please clear old ones first.");
            savedVideos.pop(); // Remove the last one that caused the error
        }
    };
    reader.readAsDataURL(file);
}

window.handleFileSelect = function (event) {
    const file = event.target.files[0];
    processVideoFile(file);
    // Reset file input so same file can be selected again if needed
    event.target.value = '';
};

window.deleteVideo = function (index) {
    if (confirm("Are you sure you want to remove this video?")) {
        savedVideos.splice(index, 1);
        localStorage.setItem('weddingVideos', JSON.stringify(savedVideos));
        renderVideos();
    }
};

window.addEventListener('DOMContentLoaded', () => {
    // Setup Drag and Drop
    const dropZone = document.getElementById('drop-zone');

    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');

            if (e.dataTransfer.files.length) {
                processVideoFile(e.dataTransfer.files[0]);
            }
        });
    }

    if (document.getElementById('video-grid')) {
        renderVideos();
    }
});
// --- END DYNAMIC VIDEO LOGIC ---

// Lightbox logic
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');

window.openLightbox = function (src) {
    if (lightbox && lightboxImg) {
        lightbox.style.display = "block";
        lightboxImg.src = src;
        document.body.style.overflow = "hidden"; // Prevent scrolling
    }
}

window.closeLightbox = function () {
    if (lightbox) {
        lightbox.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

// Close lightbox on outside click
if (lightbox) {
    lightbox.addEventListener('click', function (e) {
        if (e.target !== lightboxImg) {
            window.closeLightbox();
        }
    });
}
