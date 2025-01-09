# Time shifting thoughts and considerations

> [!NOTE]
> ### EPG on this page
> 
> The program guide on this page is a static example of what a program guide could look like. It is not connected to any live data source.

> ### Start at Top of Hour
>
> This is just an example of the functionality that could be implemented to start a current program from the beginning.

## Potential issues

### Ad server compatibility

Google DAI, which we currently use for our digital ad insertion, requires a static URL for the manifest file. As this solution requires that we append a query string to the manifest URL to enable time shifting, we will need to work with Google to find a solution or look at other partners. One known vendor is AWS MediaTailor, which is fully compatible with MediaPackage and time shifting.

### Player and platform compatibility

Background

- Manifests marked as a live object are typically played as close to the live edge as possible.
- Manifests marked as a VOD object are played from the beginning of the content by default.

When times shifting with a defined start and end time, the manifest is presented as a VOD object. However, when time shifting with a defined start time and no end time, the manifest is presented as a live object. You can also time shift with a start time in the past and stop time in the future, but this is still treated as a live object.

When clicking on the `Start at Top of Hour` button, only a start time is defined, which means the manifest is presented as a live object. In order to move the play head to the beginning of the content, the player must be instructed to do so. To achieve this in the Video.js player used on this page, we are calling `player.currentTime(0)`. At this moment, we do not know if all of our platforms can support this method to start at the beginning of the content as we would expect.

## Future considerations

### MediaPackage Harvest Jobs

MediaPackage Harvest Jobs provide a way to create VOD assets from live streams. This feature can be valuable for creating permanent VOD copies of live content.

### Better SCTE-35 markers to help describe the contents boundaries

This could help us find the exact start and end times of programs within the manifest and provide a seamless experience for the viewer. This could be by varrying the markers sent in the stream or 

### Complete livestream EPG

We currently have EPG data from content scheduled to be recorded in Wildmoka, but we need to unify this data with the schedule in ControlPlus. Having all of this data in one place would allow us to create a fully featured EPG for our livestreams.

## How MediaPackage time shifting works

MediaPackage time shifting allows viewers to watch content from a specific point in time using query parameters appended to the manifest URL. There are two supported time formats:

#### ISO 8601 Format

The preferred format uses ISO 8601 datetime strings:

```datetime-url
?start=2024-01-08T14:30:00-06:00
?end=2024-01-08T15:30:00-06:00
```

#### POSIX Timestamp Format

Alternatively, POSIX timestamps (seconds since epoch) can be used:

```datetime-url
?start=1704748200
?end=1704751800
```

#### Query Parameters

- `start`: Required. Specifies the starting point of the time-shifted content
- `end`: Optional. Specifies the ending point of the time-shifted content

#### Behavior

1. With only `start` parameter:
   - Content begins at specified start time
   - Continues to live edge
   - Manifest is treated as a live object
   - Example: `?start=2024-01-08T14:30:00-06:00`

2. With both `start` and `end` parameters:
   - Content begins at start time
   - Ends at specified end time
   - Manifest is treated as a VOD object
   - Example: `?start=2024-01-08T14:30:00-06:00&end=2024-01-08T15:30:00-06:00`

3. Time Window Limitations:
   - Start time must be within the time shift window (currently 48 hours)
   - End time must be after start time
   - End time can be in the future (will continue to live edge)

#### Examples

1. Start from 2 hours ago:

```datetime-url
?start=2024-01-08T12:30:00-06:00
```

2. Watch a specific hour-long segment:

```datetime-url
?start=2024-01-08T12:00:00-06:00&end=2024-01-08T13:00:00-06:00
```
