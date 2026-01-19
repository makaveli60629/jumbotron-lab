export const CONFIG = {
  build: "SCARLETT_WORLD_ORCH_TESTSERVER_v3_INWORLD_JUMBO_UI",

  // Spawn pad
  spawn: { x: 0, y: 0, z: 3.2, yawDeg: 180 },

  // Lighting
  lighting: {
    ambient: 0.55,
    key:  { intensity: 1.15, x: 8,  y: 10, z: 6 },
    fill: { intensity: 0.75, x: -8, y: 6,  z: -6 }
  },

  // Jumbotron + in-world control panel
  jumbotron: {
    enabled: true,
    position: { x: 0, y: 3.2, z: -6.5 },
    size: { w: 6.4, h: 3.6 },

    // In-world button panel position (under the jumbotron)
    panel: {
      position: { x: 0, y: 1.25, z: -5.75 },
      scale: 1.0
    },

    // Playback defaults
    volume: 0.9,
    muted: false,
    startIndex: 0,

    // Parsed from your M3U snippet (kept short for test). Add more if you want.
    channels: [
      { name: "Buzzr",       url: "https://buzzrota-ono.amagi.tv/playlist1080.m3u8", type: "hls" },
      { name: "Retro TV",    url: "https://bcovlive-a.akamaihd.net/5e531be3ed6c41229b2af2d9bffba88d/us-east-1/6183977686001/profile_1/chunklist.m3u8", type: "hls" },
      { name: "Stadium",     url: "https://bcovlive-a.akamaihd.net/e64d564b9275484f85981d8c146fb915/us-east-1/5994000126001/profile_1/976f34cf5a614518b7b539cbf9812080/chunklist_ssaiV.m3u8", type: "hls" },
      { name: "Biz TV",      url: "https://thegateway.app/BizTV/BizTV-Tones/chunks.m3u8?nimblesessionid=94690008", type: "hls" },
      { name: "Heartland",   url: "https://bcovlive-a.akamaihd.net/1ad942d15d9643bea6d199b729e79e48/us-east-1/6183977686001/profile_1/chunklist.m3u8", type: "hls" },
      { name: "Rev'n",       url: "https://bcovlive-a.akamaihd.net/a71236fdda1747999843bd3d55bdd6fa/us-east-1/6183977686001/profile_1/chunklist.m3u8", type: "hls" },
      { name: "CNN",         url: "https://tve-live-lln.warnermediacdn.com/hls/live/586495/cnngo/cnn_slate/VIDEO_0_3564000.m3u8", type: "hls" },

      // NOTE: YouTube live links cannot be used as a raw <video> src. Keep here for reference only.
      // { name: "CNBC (YouTube)", url: "https://www.youtube.com/c/CNBC/live", type: "youtube" },

      { name: "Bloomberg",   url: "https://bloomberg.com/media-manifest/streams/us.m3u8", type: "hls" },
      { name: "ABC News",    url: "https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8", type: "hls" },
      { name: "CBS News",    url: "https://cbsnews.akamaized.net/hls/live/2020607/cbsnlineup_8/master.m3u8", type: "hls" },

      // Mixed content (http) may be blocked on https sites; kept as-is because it was in your list.
      // If blocked, host a https alternative.
      { name: "NBC News Now", url: "http://dai2.xumo.com/xumocdn/p=roku/amagi_hls_data_xumo1212A-xumo-nbcnewsnow/CDN/playlist.m3u8", type: "hls" },

      { name: "Reuters TV",  url: "https://reuters-reutersnow-1-eu.rakuten.wurl.tv/playlist.m3u8", type: "hls" },
      { name: "NASA TV Public", url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master_2000.m3u8", type: "hls" },
      { name: "NASA TV Media",  url: "https://ntv2.akamaized.net/hls/live/2013923/NASA-NTV2-HLS/master.m3u8", type: "hls" },
      { name: "BBC Food (Pluto)", url: "https://service-stitcher.clusters.pluto.tv/v1/stitch/embed/hls/channel/5fb5844bf5514d0007945bda/master.m3u8?deviceId=channel&deviceModel=web&deviceVersion=1.0&appVersion=1.0&deviceType=rokuChannel&deviceMake=rokuChannel&deviceDNT=1&advertisingId=channel&embedPartner=rokuChannel&appName=rokuchannel&is_lat=1&bmodel=bm1&content=channel&platform=web&tags=ROKU_CONTENT_TAGS&coppa=false&content_type=livefeed&rdid=channel&genre=ROKU_ADS_CONTENT_GENRE&content_rating=ROKU_ADS_CONTENT_RATING&studio_id=viacom&channel_id=channel", type: "hls" },
      { name: "BBC Home (Pluto)", url: "https://service-stitcher.clusters.pluto.tv/v1/stitch/embed/hls/channel/5fb5836fe745b600070fc743/master.m3u8?deviceId=channel&deviceModel=web&deviceVersion=1.0&appVersion=1.0&deviceType=rokuChannel&deviceMake=rokuChannel&deviceDNT=1&advertisingId=channel&embedPartner=rokuChannel&appName=rokuchannel&is_lat=1&bmodel=bm1&content=channel&platform=web&tags=ROKU_CONTENT_TAGS&coppa=false&content_type=livefeed&rdid=channel&genre=ROKU_ADS_CONTENT_GENRE&content_rating=ROKU_ADS_CONTENT_RATING&studio_id=viacom&channel_id=channel", type: "hls" },
      { name: "Docurama",    url: "https://cinedigm.vo.llnwd.net/conssui/amagi_hls_data_xumo1234A-docuramaA/CDN/master.m3u8", type: "hls" },
      { name: "Drybar Comedy", url: "https://drybar-drybarcomedy-1-ca.samsung.wurl.com/manifest/playlist.m3u8", type: "hls" },
      { name: "Music Channel", url: "http://media.boni-records.com/index.m3u8", type: "hls" }
    ]
  }
};
