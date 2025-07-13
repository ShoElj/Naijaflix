// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {

    // --- CONSTANTS ---
    const API_KEY = 'api_key=3fd2be6f0c70a2a598f084ddfb75487c';
    const BASE_URL = 'https://api.themoviedb.org/3';
    const IMG_URL = 'https://image.tmdb.org/t/p/w500';
    const BACKDROP_URL = 'https://image.tmdb.org/t/p/w1280';

    // --- DOM ELEMENTS ---
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const resultsGrid = document.getElementById('resultsGrid');
    const resultsHeading = document.getElementById('results-heading');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');
    const toggleSwitch = document.getElementById('toggleSwitch');
    const toggleMovies = document.getElementById('toggleMovies');
    const toggleTv = document.getElementById('toggleTv');
    const genreContainer = document.getElementById('genreContainer');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    
    // --- APP STATE ---
    let currentMediaType = 'movie';
    let activeGenre = null;

    // --- API URLS ---
    function getApiUrls() {
        return {
            search: `${BASE_URL}/search/${currentMediaType}?${API_KEY}&query=`,
            popular: `${BASE_URL}/discover/${currentMediaType}?${API_KEY}&region=NG&sort_by=popularity.desc`,
            genres: `${BASE_URL}/genre/${currentMediaType}/list?${API_KEY}`,
            withGenre: `${BASE_URL}/discover/${currentMediaType}?${API_KEY}&sort_by=popularity.desc&with_genres=`,
            details: `${BASE_URL}/${currentMediaType}/`, // Needs ID
            videos: `${BASE_URL}/${currentMediaType}/` // Needs ID
        };
    }

    // --- CORE FUNCTIONS ---
    async function fetchAndDisplay(url, heading) {
        showLoader(true);
        resultsGrid.innerHTML = '';
        errorMessage.classList.add('hidden');
        resultsHeading.textContent = heading;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                displayMedia(data.results);
            } else {
                showError('No results found.');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            showError('Could not fetch data. Please try again.');
        } finally {
            showLoader(false);
        }
    }

    function displayMedia(mediaItems) {
        resultsGrid.innerHTML = '';
        mediaItems.forEach(item => {
            const { id, title, name, poster_path, vote_average, release_date, first_air_date } = item;
            const itemTitle = title || name;
            const itemDate = release_date || first_air_date;

            const mediaCard = document.createElement('div');
            mediaCard.classList.add('movie-card', 'rounded-lg', 'shadow-lg', 'relative');
            mediaCard.dataset.id = id; // Store ID for modal
            
            const poster = poster_path ? IMG_URL + poster_path : 'https://placehold.co/500x750/1f1f1f/E50914?text=No+Image';

            mediaCard.innerHTML = `
                <img src="${poster}" alt="${itemTitle}" class="w-full h-full object-cover rounded-lg">
                <div class="absolute bottom-0 left-0 right-0 p-4 movie-info text-white">
                    <h3 class="font-bold truncate">${itemTitle}</h3>
                    <div class="flex justify-between items-center text-sm mt-1">
                        <span>${itemDate ? itemDate.split('-')[0] : 'N/A'}</span>
                        <span class="font-semibold text-yellow-400">${vote_average ? vote_average.toFixed(1) : 'N/A'} ⭐</span>
                    </div>
                </div>
            `;
            mediaCard.addEventListener('click', () => openModal(id));
            resultsGrid.appendChild(mediaCard);
        });
    }

    async function fetchAndDisplayGenres() {
        genreContainer.innerHTML = '';
        const urls = getApiUrls();
        try {
            const res = await fetch(urls.genres);
            const data = await res.json();
            data.genres.forEach(genre => {
                const tag = document.createElement('button');
                tag.classList.add('genre-tag', 'px-4', 'py-1', 'rounded-full', 'text-sm', 'font-medium');
                tag.id = genre.id;
                tag.textContent = genre.name;
                tag.addEventListener('click', () => handleGenreClick(genre.id, genre.name));
                genreContainer.appendChild(tag);
            });
        } catch (error) {
            console.error('Error fetching genres:', error);
        }
    }

    // --- MODAL FUNCTIONS ---
    async function openModal(id) {
        const urls = getApiUrls();
        const detailsUrl = `${urls.details}${id}?${API_KEY}`;
        const videosUrl = `${urls.videos}${id}/videos?${API_KEY}`;

        try {
            const [detailsRes, videosRes] = await Promise.all([fetch(detailsUrl), fetch(videosUrl)]);
            const details = await detailsRes.json();
            const videos = await videosRes.json();

            const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || videos.results[0];
            
            modalContent.innerHTML = `
                <button id="modalCloseBtn" class="modal-close-btn">&times;</button>
                <div class="relative">
                    <img src="${details.backdrop_path ? BACKDROP_URL + details.backdrop_path : 'https://placehold.co/1280x720/1f1f1f/E50914?text=NaijaFlix'}" class="w-full h-48 md:h-64 object-cover rounded-t-lg">
                    <div class="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
                </div>
                <div class="p-6">
                    <h2 class="text-3xl font-bold mb-2">${details.title || details.name}</h2>
                    <p class="text-gray-400 text-sm mb-4">${details.overview}</p>
                    ${trailer ? `<a href="https://www.youtube.com/watch?v=${trailer.key}" target="_blank" class="inline-block search-button text-white font-semibold rounded-full px-6 py-2 transition-colors duration-300 mb-4">Watch Trailer</a>` : ''}
                    <div class="text-sm text-gray-300">
                        <p><strong>Release Date:</strong> ${details.release_date || details.first_air_date}</p>
                        <p><strong>Rating:</strong> ${details.vote_average.toFixed(1)} / 10</p>
                    </div>
                </div>
            `;
            
            modalOverlay.classList.add('active');
            document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
        } catch (error) {
            console.error('Error opening modal:', error);
            modalContent.innerHTML = `<p class="p-6">Could not load details.</p><button id="modalCloseBtn" class="modal-close-btn">&times;</button>`;
            modalOverlay.classList.add('active');
            document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
        }
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        modalContent.innerHTML = ''; // Clear content to stop video if any
    }

    // --- EVENT HANDLERS ---
    function handleGenreClick(genreId, genreName) {
        if (activeGenre === genreId) {
            activeGenre = null;
            initializeApp(); // Go back to default popular view
        } else {
            activeGenre = genreId;
            const urls = getApiUrls();
            fetchAndDisplay(urls.withGenre + genreId, `${genreName} ${currentMediaType === 'movie' ? 'Movies' : 'Shows'}`);
        }
         // Update active button style
        document.querySelectorAll('.genre-tag').forEach(tag => {
            tag.classList.toggle('active', parseInt(tag.id) === activeGenre);
        });
    }

    function handleToggle() {
        currentMediaType = currentMediaType === 'movie' ? 'tv' : 'movie';
        toggleSwitch.className = `toggle-switch ${currentMediaType}`;
        searchInput.placeholder = `Search for a ${currentMediaType === 'movie' ? 'movie' : 'TV show'}...`;
        initializeApp();
    }

    // --- UTILITY & INITIALIZATION ---
    function showLoader(isLoading) { loader.classList.toggle('hidden', !isLoading); }
    function showError(message) { errorMessage.textContent = message; errorMessage.classList.remove('hidden'); }
    
    function initializeApp() {
        const urls = getApiUrls();
        const heading = `Popular ${currentMediaType === 'movie' ? 'Movies' : 'TV Shows'} in Nigeria`;
        fetchAndDisplay(urls.popular, heading);
        fetchAndDisplayGenres();
        activeGenre = null;
    }

    // --- EVENT LISTENERS ---
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            const urls = getApiUrls();
            fetchAndDisplay(urls.search + searchTerm, `Results for "${searchTerm}"`);
        }
    });
    toggleMovies.addEventListener('click', () => { if (currentMediaType !== 'movie') handleToggle(); });
    toggleTv.addEventListener('click', () => { if (currentMediaType !== 'tv') handleToggle(); });
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

    // --- INITIAL LOAD ---
    initializeApp();
});
