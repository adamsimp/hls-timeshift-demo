const DateTime = luxon.DateTime;

const weekdayPrograms = [
    { time: '05:00', duration: 30, title: 'KPRC 2 News - 5:00am' },
    { time: '05:30', duration: 30, title: 'KPRC 2 News - 5:30am' },
    { time: '06:00', duration: 60, title: 'KPRC 2 News - 6:00am' },
    { time: '12:00', duration: 60, title: 'KPRC 2 News - Noon' },
    { time: '13:00', duration: 60, title: 'Houston Life' },
    { time: '15:00', duration: 30, title: 'KPRC 2 News - 3:00pm' },
    { time: '16:00', duration: 60, title: 'KPRC 2 News - 4:00pm' },
    { time: '17:00', duration: 30, title: 'KPRC 2 News - 5:00pm' },
    { time: '18:00', duration: 30, title: 'KPRC 2 News - 6:00pm' },
    { time: '22:00', duration: 35, title: 'KPRC 2 News - 10:00pm' }
];

// Initialize video player
const player = videojs('video-player', {
    fluid: true,
    controls: true,
    muted: true,
    autoplay: true,
    liveui: false,  // Disable live UI features
    liveTracker: {
        trackingThreshold: 0,  // Don't auto-seek to live
        liveTolerance: 15  // Reduce live tolerance
    }
});

let currentProgram = null;
let nowPlayingTimeout = null;
let isLivePlayback = true;

// Initialize UI elements
const returnLiveButton = document.getElementById('return-live');
const topHourButton = document.getElementById('top-hour');
const liveIndicator = document.querySelector('.live-indicator');
const timeFormatRadios = document.getElementsByName('timeFormat');

function formatTimeParams(startTime, endTime, format = 'iso') {
    if (format === 'iso') {
        return {
            start: startTime.toFormat("yyyy-MM-dd'T'HH:mm:ssZZ"),
            end: endTime ? endTime.toFormat("yyyy-MM-dd'T'HH:mm:ssZZ") : null
        };
    } else {
        return {
            start: Math.floor(startTime.toUTC().toSeconds()),
            end: endTime ? Math.floor(endTime.toUTC().toSeconds()) : null
        };
    }
}

function updateUrlDisplay(startTime, endTime) {
    const urlDisplay = document.getElementById('current-params');
    const urlLabel = document.querySelector('.url-label');
    const format = Array.from(timeFormatRadios).find(radio => radio.checked).value;
    
    if (!startTime) {
        urlDisplay.textContent = 'Live Stream';
        urlLabel.textContent = 'Stream Status:';
        return;
    }
    
    urlLabel.textContent = 'Time Parameters:';
    
    const params = formatTimeParams(startTime, endTime, format);
    const paramStrings = [];
    
    if (params.start) paramStrings.push(`start=${params.start}`);
    if (params.end) paramStrings.push(`end=${params.end}`);
    
    urlDisplay.textContent = `?${paramStrings.join('&')}`;
}

function initializeParametersCopy() {
    const urlDisplay = document.getElementById('current-params');
    
    urlDisplay.title = 'Click to copy parameters';
    
    urlDisplay.addEventListener('click', () => {
        if (!urlDisplay.classList.contains('live-stream')) {
            const originalText = urlDisplay.textContent;
            
            navigator.clipboard.writeText(originalText).then(() => {
                urlDisplay.classList.add('copied');
                urlDisplay.textContent = 'Copied!';
                
                setTimeout(() => {
                    urlDisplay.classList.remove('copied');
                    urlDisplay.textContent = originalText;
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy:', err);
                urlDisplay.textContent = 'Copy failed';
                setTimeout(() => {
                    urlDisplay.textContent = originalText;
                }, 1500);
            });
        }
    });
}

function updatePlayerState(isLive) {
    isLivePlayback = isLive;
    if (isLive) {
        liveIndicator.textContent = 'LIVE';
        liveIndicator.style.background = 'rgba(255, 0, 0, 0.8)';
        returnLiveButton.classList.remove('visible');
        topHourButton.classList.add('visible');
    } else {
        liveIndicator.textContent = 'PRERECORDED';
        liveIndicator.style.background = 'rgba(0, 70, 187, 0.8)';
        returnLiveButton.classList.add('visible');
        topHourButton.classList.remove('visible');
    }
}

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

function playProgram(startTime, endTime, title) {
    const url = new URL(player.src());
    const params = formatTimeParams(startTime, endTime, 
        Array.from(timeFormatRadios).find(radio => radio.checked).value);
    
    url.searchParams.set('start', params.start);
    if (params.end) {
        url.searchParams.set('end', params.end);
    } else {
        url.searchParams.delete('end');
    }
    
    updateUrlDisplay(startTime, endTime);
    updatePlayerState(false);

    currentProgram = { 
        title, 
        startTime,
        duration: endTime ? endTime.diff(startTime, 'minutes').minutes : null
    };
    showNowPlaying(title, startTime);

    player.src({
        src: url.toString(),
        type: 'application/x-mpegURL'
    });
    
    player.play();
    
    document.querySelector('.video-container').scrollIntoView({
        behavior: 'smooth'
    });
}

function startAtTopOfHour() {
    const now = DateTime.now().setZone('America/Chicago');
    const topOfHour = now.startOf('hour');
    
    playProgram(topOfHour, null, 'Stream from Top of Hour');
    
    // Wait for the player to be ready with the new source
    player.one('loadedmetadata', () => {
        // Force playback from the beginning of the available segments
        player.currentTime(0);
    });
}

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
    
    function createProgramCard(title, startTime, endTime) {
        const card = document.createElement('div');
        card.className = 'program-card';
        
        // Get relative day description
        const diffInDays = Math.floor(now.diff(startTime, 'days').days);
        
        let dayLabel;
        if (diffInDays === 0) {
            dayLabel = 'Today';
        } else if (diffInDays === 1) {
            dayLabel = 'Yesterday';
        } else {
            dayLabel = '2 Days Ago';
        }
        
        const timeStr = startTime.toLocaleString({
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        card.innerHTML = `
            <div class="program-day">${dayLabel}</div>
            <div class="program-time">${timeStr}</div>
            <div class="program-title">${title}</div>
        `;

        card.onclick = () => {
            playProgram(startTime, endTime, title);
        };

        return card;
    }
    
    // Create cards
    allPrograms.forEach(program => {
        const card = createProgramCard(program.title, program.start, program.end);
        container.appendChild(card);
    });
}

// Initialize URL params display
const initialUrl = new URL(player.src());
const urlDisplay = document.getElementById('current-params');
urlDisplay.textContent = 'Live Stream';

// Initialize copy button functionality
document.getElementById('copy-url').addEventListener('click', () => {
    const url = new URL(player.src());
    const format = Array.from(timeFormatRadios).find(radio => radio.checked).value;
    
    // If we have a current program, ensure we use the correct format
    if (currentProgram) {
        const params = formatTimeParams(currentProgram.startTime, currentProgram.endTime, format);
        url.searchParams.delete('start');
        url.searchParams.delete('end');
        
        if (params.start) url.searchParams.append('start', params.start);
        if (params.end) url.searchParams.append('end', params.end);
    }
    
    // Create raw URL string without encoding time parameters
    let urlString = url.origin + url.pathname;
    const searchParams = url.searchParams.toString();
    if (searchParams) {
        urlString += '?' + decodeURIComponent(searchParams);
    }
    
    navigator.clipboard.writeText(urlString).then(() => {
        const button = document.getElementById('copy-url');
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="copy-icon">✓</span>Copied!';
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    });
});

// Update time format radio handlers
timeFormatRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (currentProgram) {
            const endTime = currentProgram.startTime.plus({ minutes: currentProgram.duration });
            updateUrlDisplay(currentProgram.startTime, endTime);
        }
    });
});

// Return to live functionality
returnLiveButton.addEventListener('click', () => {
    const url = new URL(player.src());
    url.searchParams.delete('start');
    url.searchParams.delete('end');
    
    updateUrlDisplay(null, null);
    updatePlayerState(true);
    
    player.src({
        src: url.toString(),
        type: 'application/x-mpegURL'
    });
    
    player.play();
});

// Top of hour functionality
topHourButton.addEventListener('click', startAtTopOfHour);

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

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    initializeParametersCopy();
    createProgramCards();
    updatePlayerState(true);
});