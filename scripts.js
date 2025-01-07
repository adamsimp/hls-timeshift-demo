const DateTime = luxon.DateTime;

// News programming schedule (24-hour format)
const weekdayPrograms = [
    { time: '05:00', duration: 30, title: 'KPRC 2 News Today at 5:00am' },
    { time: '05:30', duration: 30, title: 'KPRC 2 News Today at 5:30am' },
    { time: '06:00', duration: 60, title: 'KPRC 2 News Today at 6:00am' },
    { time: '12:00', duration: 60, title: 'KPRC 2 News Today at Noon' },
    { time: '13:00', duration: 60, title: 'Houston Life' },
    { time: '15:00', duration: 30, title: 'KPRC 2 News Today at 3:00pm' },
    { time: '16:00', duration: 60, title: 'KPRC 2 News Today at 4:00pm' },
    { time: '17:00', duration: 30, title: 'KPRC 2 News Today at 5:00pm' },
    { time: '18:00', duration: 30, title: 'KPRC 2 News Today at 6:00pm' },
    { time: '22:00', duration: 35, title: 'KPRC 2 News Today at 10:00pm' }
];

// Initialize video player
const player = videojs('video-player', {
    fluid: true,
    playbackRates: [0.5, 1, 1.5, 2],
    controls: true,
    autoplay: false
});

let currentProgram = null;
let nowPlayingTimeout = null;

// Initialize UI elements
const returnLiveButton = document.getElementById('return-live');
const liveIndicator = document.querySelector('.live-indicator');

function showNowPlaying(title, startTime) {
    const nowPlaying = document.getElementById('now-playing');
    const titleElement = nowPlaying.querySelector('.now-playing-title');
    const timeElement = nowPlaying.querySelector('.now-playing-time');
    
    titleElement.textContent = title;
    timeElement.textContent = `Originally aired ${startTime.toLocaleString({
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    })}`;
    
    nowPlaying.classList.add('visible');
    
    if (nowPlayingTimeout) {
        clearTimeout(nowPlayingTimeout);
    }
    
    nowPlayingTimeout = setTimeout(() => {
        nowPlaying.classList.remove('visible');
    }, 5000);
}

function updatePlayerState(isLive) {
    if (isLive) {
        liveIndicator.textContent = 'LIVE';
        liveIndicator.style.background = 'rgba(255, 0, 0, 0.8)';
        returnLiveButton.classList.remove('visible');
    } else {
        liveIndicator.textContent = 'PRERECORDED';
        liveIndicator.style.background = 'rgba(0, 70, 187, 0.8)';
        // Only show return to live button when in prerecorded mode
        setTimeout(() => returnLiveButton.classList.add('visible'), 100);
    }
}

function createProgramCard(title, startTime, endTime) {
    const card = document.createElement('div');
    card.className = 'program-card';
    
    const timeStr = startTime.toLocaleString({
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        month: 'short',
        day: 'numeric'
    });

    card.innerHTML = `
        <div class="program-time">${timeStr}</div>
        <div class="program-title">${title}</div>
    `;

    card.onclick = () => {
        const startISO = startTime.toISO({
            includeOffset: true,
            suppressMilliseconds: true
        });
        const endISO = endTime.toISO({
            includeOffset: true,
            suppressMilliseconds: true
        });
        
        const url = new URL(player.src());
        url.searchParams.set('start', startISO);
        url.searchParams.set('end', endISO);
        
        // Update URL params display
        const urlDisplay = document.getElementById('current-params');
        const params = Array.from(url.searchParams.entries())
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        urlDisplay.textContent = params ? `?${params}` : 'No parameters';
        
        // Update player state
        updatePlayerState(false);

        // Store current program info and show now playing
        currentProgram = { title, startTime };
        showNowPlaying(title, startTime);

        player.src({
            src: url.toString(),
            type: 'application/x-mpegURL'
        });
        
        player.play();
        
        // Scroll to player
        document.querySelector('.video-container').scrollIntoView({
            behavior: 'smooth'
        });
    };

    return card;
}

// Return to live functionality
returnLiveButton.addEventListener('click', () => {
    const url = new URL(player.src());
    url.searchParams.delete('start');
    url.searchParams.delete('end');
    
    // Update URL display
    const urlDisplay = document.getElementById('current-params');
    urlDisplay.textContent = 'No parameters';
    
    // Update player state
    updatePlayerState(true);
    
    player.src({
        src: url.toString(),
        type: 'application/x-mpegURL'
    });
    
    player.play();
});

// Handle video player events
player.on('play', () => {
    if (currentProgram) {
        showNowPlaying(currentProgram.title, currentProgram.startTime);
    }
});

player.on('useractive', () => {
    if (currentProgram) {
        showNowPlaying(currentProgram.title, currentProgram.startTime);
    }
});

function createProgramCards() {
    const container = document.getElementById('programs-container');
    const now = DateTime.now().setZone('America/Chicago');
    
    // Calculate exact 48 hours ago
    const fortyEightHoursAgo = now.minus({ seconds: 172800 });
    
    // Get the current day and previous days
    const dates = [
        now,
        now.minus({ days: 1 }),
        now.minus({ days: 2 })
    ];
    
    let allPrograms = [];
    
    dates.forEach(date => {
        weekdayPrograms.forEach(program => {
            const [hour, minute] = program.time.split(':').map(Number);
            let programStart = date.set({ hour, minute, second: 0 });
            const programEnd = programStart.plus({ minutes: program.duration });
            
            if (programStart <= now && programStart >= fortyEightHoursAgo) {
                allPrograms.push({
                    title: program.title,
                    start: programStart,
                    end: programEnd
                });
            }
        });
    });
    
    // Sort by start time, oldest first
    allPrograms.sort((a, b) => a.start - b.start);
    
    // Clear existing programs
    container.innerHTML = '';
    
    // Create cards
    allPrograms.forEach(program => {
        const card = createProgramCard(program.title, program.start, program.end);
        container.appendChild(card);
    });
}

// Initialize URL params display
const initialUrl = new URL(player.src());
const urlDisplay = document.getElementById('current-params');
const params = Array.from(initialUrl.searchParams.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
urlDisplay.textContent = params ? `?${params}` : 'No parameters';

// Initialize copy button functionality
document.getElementById('copy-url').addEventListener('click', () => {
    const url = new URL(player.src());
    navigator.clipboard.writeText(url.toString()).then(() => {
        const button = document.getElementById('copy-url');
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="copy-icon">✓</span>Copied!';
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    });
});

// Initialize the page
createProgramCards();