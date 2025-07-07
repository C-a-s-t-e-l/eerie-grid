// Global variables
let map;
let currentMarker; 
let allStories = [];
let storyMarkers = {};
let philippinesFocus = true;
const PH_BOUNDS_COORDS = {
    minLat: 4.5, maxLat: 21.2,
    minLng: 116.9, maxLng: 126.6
};
let philippinesMapBounds = null;
let lastClickedLatLng = null; 

const creepyIcon = new L.Icon({
    iconUrl: 'https://static.vecteezy.com/system/resources/previews/019/858/520/non_2x/eye-flat-color-outline-icon-free-png.png', 
    iconSize: [25, 35],               
    iconAnchor: [12, 35],                 
    popupAnchor: [1, -30]              
});

const storyModal = document.getElementById('story-modal');
const modalTitle = document.getElementById('modal-story-title');
const modalLocation = document.getElementById('modal-story-location');
const modalFullStory = document.getElementById('modal-full-story');
const modalCloseButton = document.getElementById('modal-close-button');

function openStoryModal(story) {
    if (!storyModal || !modalTitle || !modalLocation || !modalFullStory) {
        console.error('Modal elements not found!');
        return;
    }
    modalTitle.textContent = story.title || 'Untitled Story';
    modalLocation.textContent = `Location: ${story.locationName || 'Unknown Location'}`;

    modalFullStory.innerHTML = ''; 
    const fullStoryText = story.fullStory || '';
    const paragraphs = fullStoryText.split('\n');
    paragraphs.forEach(paraText => {
        if (paraText.trim() !== '') {
            const p = document.createElement('p');
            p.textContent = paraText;
            modalFullStory.appendChild(p);
        }
    });

    storyModal.classList.remove('modal-hidden');
    storyModal.classList.add('modal-visible');
}

function closeStoryModal() {
    if (!storyModal) return;
    storyModal.classList.remove('modal-visible');
}

if (modalCloseButton) {
    modalCloseButton.addEventListener('click', closeStoryModal);
}

if (storyModal) {
    storyModal.addEventListener('click', function(event) {
        if (event.target === storyModal) {   
            closeStoryModal();
        }
    });
 
    window.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && storyModal.classList.contains('modal-visible')) {
            closeStoryModal();
        }
    });
}

function initMap() {
    const philippinesCenter = [12.8797, 121.7740];
    const initialZoom = 6;
    map = L.map('map').setView(philippinesCenter, initialZoom);

    const southWest = L.latLng(PH_BOUNDS_COORDS.minLat, PH_BOUNDS_COORDS.minLng);
    const northEast = L.latLng(PH_BOUNDS_COORDS.maxLat, PH_BOUNDS_COORDS.maxLng);
    philippinesMapBounds = L.latLngBounds(southWest, northEast);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri', maxZoom: 18
    }).addTo(map);
    L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri', maxZoom: 18
    }).addTo(map);
    L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri', maxZoom: 18
    }).addTo(map);

    if (map) {
        lastClickedLatLng = map.getCenter();
    }

    map.on('click', function(event) {
        placeMarkerAndGetLocationName(event);
        lastClickedLatLng = event.latlng;
    });

    const provider = new GeoSearch.OpenStreetMapProvider({
        params: { countrycodes: philippinesFocus ? 'ph' : '' },
    });

    const searchControl = new GeoSearch.GeoSearchControl({
        provider: provider, style: 'bar', showMarker: true, showPopup: false,
        marker: { icon: creepyIcon, draggable: false },
        autoClose: true, keepResult: true, searchLabel: 'Search haunted locations...',
        notFoundMessage: 'Sorry, that place is too elusive to find.',
    });
    map.addControl(searchControl);

    map.on('geosearch/showlocation', function (result) {
        if (currentMarker) {
            currentMarker.remove();
            currentMarker = null;
            document.getElementById('latitude').value = '';
            document.getElementById('longitude').value = '';
            document.getElementById('locationName').value = '';
        }
        lastClickedLatLng = L.latLng(result.location.y, result.location.x); 
    });

    const mapLoadingOverlay = document.querySelector('.map-loading-overlay');
    if (mapLoadingOverlay) {
        mapLoadingOverlay.style.display = 'none';
    }
}

async function placeMarkerAndGetLocationName(mapClickEvent) { 
    const latlng = mapClickEvent.latlng;
    if (currentMarker) currentMarker.remove();
    currentMarker = L.marker([latlng.lat, latlng.lng], { icon: creepyIcon }).addTo(map);

    document.getElementById('latitude').value = latlng.lat.toFixed(6);
    document.getElementById('longitude').value = latlng.lng.toFixed(6);

    const locationNameInput = document.getElementById('locationName'); 
    locationNameInput.value = "Fetching location..."; 

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`);
        if (!response.ok) throw new Error(`Nominatim: ${response.status}`);
        const data = await response.json();
        locationNameInput.value = data.display_name || "Location name not found";
    } catch (error) {
        console.error("Reverse geocoding error:", error);
        locationNameInput.value = "Error fetching location";
    }
}

function displayMarkers(storiesToDisplay) {
    for (const storyId in storyMarkers) {
        if (storyMarkers.hasOwnProperty(storyId)) {
            storyMarkers[storyId].remove(); 
        }
    }
    storyMarkers = {}; 

    storiesToDisplay.forEach(story => {
        if (story.lat && story.lng) {
            const marker = L.marker([story.lat, story.lng], { icon: creepyIcon }).addTo(map);
            storyMarkers[story.id] = marker; 
            marker.on('click', () => {
                openStoryModal(story);
            });
        }
    });
}

function updateMapFocus() { 
    const toggleButton = document.getElementById('toggle-world-button');
    if (map) lastClickedLatLng = map.getCenter(); 

    if (philippinesFocus) {
        if (map && philippinesMapBounds) map.setMaxBounds(philippinesMapBounds);
        if (toggleButton) toggleButton.textContent = 'Open up the Horrors of the World';
        const phStories = allStories.filter(story =>
            story.lat >= PH_BOUNDS_COORDS.minLat && story.lat <= PH_BOUNDS_COORDS.maxLat &&
            story.lng >= PH_BOUNDS_COORDS.minLng && story.lng <= PH_BOUNDS_COORDS.maxLng
        );
        displayMarkers(phStories); 
    } else { 
        if (map) map.setMaxBounds(null);
        if (toggleButton) toggleButton.textContent = 'Focus on Philippines';
        displayMarkers(allStories); 
    }
}

function handleStorySubmit(event) {
    event.preventDefault();
    const title = document.getElementById('title').value;
    const storyText = document.getElementById('fullStory').value;
    const latStr = document.getElementById('latitude').value;
    const lngStr = document.getElementById('longitude').value;
    const locationName = document.getElementById('locationName').value;

    if (!title || !storyText || !latStr || !lngStr || !locationName) {
        alert('Please fill in all fields and select a location on the map.');
        return;
    }
    const latNum = parseFloat(latStr);
    const lngNum = parseFloat(lngStr);

    if (philippinesFocus) {
        if (latNum < PH_BOUNDS_COORDS.minLat || latNum > PH_BOUNDS_COORDS.maxLat ||
            lngNum < PH_BOUNDS_COORDS.minLng || lngNum > PH_BOUNDS_COORDS.maxLng) {
            alert("Story location outside PH. To post, 'View World Map' or select location in PH.");
            return;
        }
    }

    const newStory = {
        id: 'story-' + Date.now(),
        title: title, fullStory: storyText, locationName: locationName,
        lat: latNum, lng: lngNum,
        snippet: storyText.substring(0, 100) + (storyText.length > 100 ? '...' : '')
    };

    allStories.push(newStory);
    updateMapFocus();

    document.getElementById('storyForm').reset();
    if (currentMarker) {
        currentMarker.remove();
        currentMarker = null; 
    }
    alert('Story posted locally!');
}

function checkUrlForStory() {
    const params = new URLSearchParams(window.location.search);
    const storyId = params.get('story');
    if (storyId) {
        const storyToView = allStories.find(s => s.id === storyId);
        if (storyToView && storyToView.lat && storyToView.lng) {
            map.setView([storyToView.lat, storyToView.lng], 15);
            openStoryModal(storyToView);
        } else {
            console.warn(`Story with ID "${storyId}" not found or has no coordinates.`);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initMap(); 

    const togglePostFormButton = document.getElementById('toggle-post-form-button');
    const formColumn = document.getElementById('form-column'); 

    if (togglePostFormButton && formColumn) {
        togglePostFormButton.addEventListener('click', () => {
            formColumn.classList.toggle('hidden-form');
            togglePostFormButton.textContent = formColumn.classList.contains('hidden-form') 
                ? 'Post New Story' 
                : 'Hide Submission Form';
        });
    }

    const toggleButton = document.getElementById('toggle-world-button');
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            philippinesFocus = !philippinesFocus;
            updateMapFocus();
        });
    }

    const storyForm = document.getElementById('storyForm');
    if (storyForm) {
        storyForm.addEventListener('submit', handleStorySubmit);
    }

    allStories = [...dummyStories];
    updateMapFocus(); 
    checkUrlForStory(); 
});