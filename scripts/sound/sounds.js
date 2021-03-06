/*
 * sounds.js
 * 
 * Contains functions for retrieving, prefetching, and playing sounds.
 * 
 * Also handles stores and updates the current "browseMode" of the system,
 * which controls how the system moves through web pages.  For instance,
 * does it keep reading or stop after reading the next element.  Does it
 * read through by element, word, or character.
 * 
 * The current browseMode is set in wa.js from user input, and here (sounds.js)
 * when done automatically.
 * 
 * The system calls playWaiting() every playWaitingInterval milliseconds to
 * update the current status of the system, check if a new sound needs to be
 * played.
 * 
 * Sounds to be played are stored in the soundQ array.
 */

WA.Sound = {
  // Sound playback.
  FLASH_SOUND_METHOD: 1,
  EMBED_SOUND_METHOD: 2,

  // Global statistics.
  soundsPlayed: 0,
  totalLatency: 0,

  // 1 == Flash, 2 == Embedded Player.
  soundMethod: -1,
  soundsLoaded: new Array(),

  // Constants related to sound playback.
  free_threads: 25,
  soundPlayerLoaded: false,

  // The queue of sounds that are waiting to play.
  soundQ: new Array(),
  
  // The sound that is currently being played.
  playing: null,

  // The clock frequency of the system.  The system looks for new sounds to play
  // in the queue every playWaitingInterval milliseconds.
  playWaitingInterval: 50,

  // State variables.
  lastPath: -1,
  soundState: -1,
  readyState: -1,

  startedSoundInit: false,
  


  // Determines the soundMethod that should be used.
  // Currently this is detected from the URL, eventually this should be done
  // completely automatically.
  setSoundMethod: function() {
    if(/embed=true/.test(document.location + "")) {
      return this.EMBED_SOUND_METHOD;
    } else {
      return this.FLASH_SOUND_METHOD;  
    }
  },

  // Initialize the sounds.
  initSounds: function() {
    startPriority = 30000;
    this.free_threads = 5;
    this.soundPlayerLoaded = false;
  
    this.soundQ = new Array();
    WA.Sound.setWhatsPlaying(null);
  
    this.soundMethod = 1;
    this.soundsLoaded = new Array();
  
    setBrowseMode(WA.READ);   
  },

  setWhatsPlaying: function(playing) {
    WA.Sound.playing = playing;
    WA.Interface.updatePlaying();
  },

  // Prepare a string for playing sound.
  // This includes normalizing the string by making it all lowercase, removing
  // punctuation, etc.
  prepareSound: function(sid) {
    sid = String(sid);
    if(sid && sid.length > 1) {
      sid = sid.toLowerCase();
      if(sid==".") { sid = "dot"; }
      sid = sid.replace(/(^\s*[\.\?!,\-:]*\s*)|(\s*[\.\?!,:]+\s*$)/g, "");
    }
    return sid;
  },

  // Returns a unique ID for the text entered.
  getSoundID: function(text) {
    return WA.Utils.simpleHash(text);
  },
  
  // Processes a sound by breaking it up according to punctuation,
  // then adds the resulting sound(s) to the queue of sounds to play.
  splitSoundsByBoundaries: true,
  // \u3002 - Chinese full stop (.)
  // \uff01 - Chinese exclamation (!)
  // \uff1f - Chinese question mark (?)
  // \uff1a - Chinese colon (:)
  // \uff0c - Chinese comma (,)
  // \uff1b - Chinese semi-colon (;)
  boundarySplitterRegExp: /[\.!\?:;\s]*(\s+\(|\s+\-\s+|[\.!\?:;\)]\s+|[\u3002\uff01\uff1f\uff1a\uff0c\uff1b])+[\.!\?:;\s]*/,
  splitSoundsByBoundary: function(sid) {
    return (sid + "").split(this.boundarySplitterRegExp);
  },

  // Adds a new sound to the queue of sounds to be played.
  addSound: function(sid) {
    this._addSound(sid, this._addIndividualSound);
  },

  // Adds a new sound to the queue of sounds to be played.
  _addSound: function(sid, func) {
    // Split sounds into multiple pieces to improve latency of sound retrieval.
    if(WA.Sound.splitSoundsByBoundaries) {
      var matches = WA.Sound.splitSoundsByBoundary(sid);
      if(matches && matches.length > 0) {
        for(var match_i=0, ml=matches.length; match_i<ml; match_i++) {
          if(!WA.Sound.boundarySplitterRegExp.test(matches[match_i])) {
            func(matches[match_i]);
          }
        }
      }
    } else { // TODO:  Is this needed?
      func(sid);
    }
  },


  /**
   * Silence the system and stop automatic forward progression.
   */
  silenceAll: function() {
    setBrowseMode(WA.KEYBOARD);
    WA.Sound.resetSounds();
  },

  // Adds a single sound (one that does not get split) to the sound queue.
  _addIndividualSound: function(sid) {
    //sid = WA.Sound.prepareSound(sid);
    WA.Sound.soundQ.unshift(sid);  
  },

  // Gets the next sound in the queue that should be played.
  getSound: function() {
    var sid = this.soundQ.pop();
    return sid;
  },

  // Prefetches the next element in the sound queue.
  prefetchFromSoundQ: function() {
    if(this.soundQ.length > 0) {
      var remaining = this.soundQ.slice();
      WA.Utils.log('pf from q: ' + remaining.length);
      remaining.reverse();
      this.Prefetch.addArrayToPrefetchQ(remaining);
    }
  },

  // Resets all sounds.
  stopAllSounds: function() {
    if(this.playing != null) {
      var stats = this._currentTimeAndTotalFlash(this.playing);
      var done_frac = stats[0]/stats[1];

      done_frac = (done_frac+"").substring(0,4);

      WA.Extensions.soundFinished(this.playing, done_frac);
    }

    if(this.soundMethod == this.FLASH_SOUND_METHOD) {
      soundManager.stopAll();
    } else {
      Embed.stopSounds();
    }
  },

  // Resets all sounds.
  resetSounds: function() {
    this.stopAllSounds();
    this.soundQ = null;
    this.soundQ = new Array();
    WA.Sound.setWhatsPlaying(null);
  },

  /**
   * Starts playWaiting function which queues and plays each new sound.
   */
  startPlayWaiting: function() {
  	var self = this;

		// Wait for the sound player to be loaded.
		if(!top.soundPlayerLoaded) {
      setTimeout(function() {self.startPlayWaiting();}, 50);
		} else {
      // Sound players is loaded, so start playing the sounds.
      setInterval(function(){self.playWaiting()}, this.playWaitingInterval);
		}
  },

  //  Main function called that actually plays sounds when it's supposed to.
  playWaiting: function() {
    if(this.playing!=null)
      WA.Utils.log(this.soundPlayerLoaded + '||' + this.playing + '||' + this.soundQ.length + '||' + WA.browseMode);

    if(!this.soundPlayerLoaded) {
      this.lastPath = 0;
      return;
    } else if(!this.playing && this.soundQ.length > 0) {
      this.lastPath = 1;
      var sid = this.getSound();
      this.lastPath = 3;
      WA.Sound.setWhatsPlaying(sid);
      this.playSound(sid, false);
      if(WA.prefetchStrategy > 1) {
        this.prefetchFromSoundQ();
      }
    } else if(!this.playing && WA.browseMode != WA.LOADING && WA.browseMode != WA.LOOPING &&
                WA.Keyboard.ActionQueue.queueSize() > 0) {

    	WA.Keyboard.ActionQueue.playFromQueue();
    	WA.Sound.playWaiting();
    } else if(!this.playing && (WA.browseMode == WA.READ || WA.browseMode == WA.PLAY_ONE ||
                                  WA.browseMode == WA.PLAY_ONE_BACKWARD || WA.browseMode == WA.PLAY_TWO_BACKWARD ||
                                  WA.browseMode == WA.PREV_CHAR || WA.browseMode == WA.PREV_CHAR_BACKONE)) {
      this.lastPath = 2;
      if(WA.browseMode == WA.PLAY_ONE_BACKWARD || WA.browseMode == WA.PLAY_TWO_BACKWARD || WA.browseMode == WA.PREV_CHAR || WA.browseMode == WA.PREV_CHAR_BACKONE) {
        this.lastPath = 99;
        //this.Prefetch.addObservation(this.Prefetch.prefetchTypes.PREVNODE, lastNode, WA.Keyboard.last_action);
        prevNode(true);
      } else {
        //this.Prefetch.addObservation(this.Prefetch.prefetchTypes.NEXTNODE, lastNode, WA.Keyboard.last_action);
        nextNode(true);
      }
    } else if(this.playing) {
      var is_playing = this.isPlaying(this.playing);
      if(!is_playing) {
        WA.Sound.setWhatsPlaying(null);
      }
    }
  },

  // Returns the URL for the sound file for this string.
  urlForString: function(string) {
    var url = top.sound_url_base.replace(/\$text\$/, escape(string));

    if(/^waspecialstringname:/.test(string)) {
      var s = string.replace(/^waspecialstringname:/, '');
      switch(s) {
        case "waiting":
          url = top.sounds_path + s + '.mp3';
          break;
        default:
      }      
    }

    url = proxifyURL(url, "", true);

    return url;
  },

  // Play the sound.
  playSound: function(string, bm) {
    var playdone = true;
    string = WA.Sound.prepareSound(string);
    url = WA.Sound.urlForString(string);

    switch(this.soundMethod) {
      //case this.FLASH_SOUND_METHOD: this._prefetchFlash(string, url, playdone, bm,"100"); break;
      case this.FLASH_SOUND_METHOD: this._prefetchFlash(string, url, playdone, bm); break;
      case this.EMBED_SOUND_METHOD: Embed._prefetchEmbed(string, url, playdone, bm); break;
    }
  },

  // Prefetches the key with the supplied keycode.
  prefetchKeycode: function(keycode) {
    var speak = "";
    switch(keycode) {
      case 8: speak = "back space"; break;
      default: speak = String.fromCharCode(keycode); 
    }
  
    var url = urlForString(speak);
  
    switch(this.soundMethod) {
      case this.FLASH_SOUND_METHOD: this._prefetchFlash("keycode_" + keycode, url, false, false); break;
      case this.EMBED_SOUND_METHOD: Embed._prefetchEmbed("keycode_" + keycode, url, false, false); break;
    }
  },

  // Load all the sounds for the keypresses
  setupBaseSounds: function() {
    if(this.startedSoundInit) {
      return;
    }

    this.startedSoundInit = true;

    for(var i=32; i<97; i++) {
      this.prefetchKeycode(i);
    }
  
    for(var j=123; j<127; j++) {
      this.prefetchKeycode(i);
    }
  },

  //  TODO: This is not called right now, figure out if it is useful.
  _fetchFromQueue: function() {
    for(var i=0; i<5 && i <N && this.free_threads > 0; i++) {
      var p = this.Prefetch.popQ();
      switch(this.soundMethod) {
        case 1: this._prefetchFlash(p.text, p.url, p.playdone, p.bm); break;
        case 2: Embed._prefetchEmbed(p.text, p.url, p.playdone, p.bm); break;
        default: break;
      }
    }
  },

  /**
   * Is the system going backward through the page?
   * @return Boolean Is the system currently going backwards?
   */
  isGoingBackwards: function() {
  	return (WA.browseMode == WA.PLAY_ONE_BACKWARD ||
  	         WA.browseMode == WA.PLAY_TWO_BACKWARD ||
  	         WA.browseMode == WA.PLAY_CHAR_BACKONE);
  },

  /**
   * Is playing something.
   * @return Boolean Is something being played?
   */
  isPlayingSomething: function() {
    return (this.playing!=null);
  },

  /**
   * Is the current sid being played right now?
   * @param sid Sound ID to check.
   * @return Boolean specifying whether the sound with ID sid
   *         is currently playing.
   **/
  isPlaying: function(sid) {
    sid = this.prepareSound(sid);

    switch(this.soundMethod) {
      case 1: return this._isPlayingFlash(sid);
      case 2: return this._isPlayingEmbed(sid);
      default: break;
    }
    return false;
  },

  // Is the embedded sound still playing?
  // TODO:  Implement this function.
  _isPlayingEmbed: function(string) {
    return true;
  },

  // Is the Flash sound still playing?
  _isPlayingFlash: function(string) {
    string = this.getSoundID(string);
    var sound = soundManager.getSoundById(string);
    if(!sound) this.soundState = 8;
    if(sound && sound.readyState >= 2 && sound.playState == 0) {
      return false;
    } else {
      return true;
    }
  },

  _currentTimeAndTotalFlash: function(string) {
    string = this.prepareSound(string);
    string = this.getSoundID(string);
    var sound = soundManager.getSoundById(string);

    var stats = [1.0, 1.0];
    if(sound && sound.durationEstimate > 0 && sound.durationEstimate != sound.position) {
      var pos = sound.position;
      var dur = sound.durationEstimate;

      if(this.soundQ.length > 0) {
        var slen = string.length;

        for(var i=0; i<this.soundQ.length; i++) {
          dur += sound.durationEstimate * (this.soundQ[i]+"").length;
        }
      }

      stats = [pos, dur];
    }

    return stats;
  },

  // Stores timing information useful when conducting studies.
  timingArray: new Object(),
  getTimingList: function() {
    var timing_list = "";
    var total_latency = 0;
    var total_sounds = 0;
    var total_length = 0;
    for(i in this.timingArray) {
      if(this.timingArray[i].playStart) {
        var latency = (this.timingArray[i].end - this.timingArray[i].playStart);
        if(latency > 0) {
          timing_list += latency + '\n';
          total_latency += latency;
        }
        total_length += this.timingArray[i].length;
      } else {
        alert('no playStart');
      }
      total_sounds++;
    }
  
    var mean = (total_latency/total_sounds);
    var sd = 0;
    
    for(i in this.timingArray) {
      if(this.timingArray[i].playStart) {
        var latency = (this.timingArray[i].end - this.timingArray[i].playStart);
        if(latency < 60000)
        sd += (latency - mean)*(latency - mean);
      }
    }
    sd = Math.sqrt((sd/total_sounds));
  
    return mean + ' ' + sd + ' ' + total_latency + ' ' + total_sounds + ' ' + total_length + '||';
  },

  // Code for the priority queue for DOM element prefetching.
  tInfo: function(string) {
    this.start = null;
    this.end = null;
    this.playStart = null;
    this.finished = false;
    this.length = null;
  },

  // "Prefetch" a sound into the Flash movie.
  // The name suggests that this method is only used for prefetching, but it is
  // also the primary mechanism for playing sounds as well.
  _prefetchFlash: function(string, url, playdone, bm) {
    if(!this.soundPlayerLoaded) {
      return;
    }

    var orig_string = string;
  
    string = this.getSoundID(string);
    var sound = soundManager.getSoundById(string);
  
    var old_length = 0;
    if(this.timingArray[string] && !this.timingArray[string].playStart) {
    	old_length = this.timingArray[string].length;
      this.timingArray[string + Math.random()] = this.timingArray[string];
    }
  
    this.timingArray[string] = new this.tInfo(string);
    this.timingArray[string].orig_string = orig_string;
    if(playdone) {
      this.timingArray[string].playStart = new Date();
      WA.Utils.log('starting sound: ' + this.timingArray[string].playStart.getTime() + ' ' + orig_string);
    }
    this.timingArray[string].length = old_length;
  
    if(!sound || sound.readyState == 2) {
      if(this.free_threads <= 0) {
        WA.Utils.log(this);
        this.Prefetch.addToPrefetchDOMQ(string, url, playdone, bm);
      } else {
        this.free_threads--;
        soundManager.createSound({
          id: string,
          url: url,
          autoLoad: true,
          stream: playdone,
          autoPlay: playdone,
          onload: function() {WA.Sound._onSoundLoad(this)},
          onplay: function() {
    	      this.valPath += this.sID;
    	      WA.Sound.soundsPlayed++;
          },
          whileplaying: function() {
            if(this.timingArray[this.sID].end == null) {
              WA.Sound.soundsPlayed++;
              this.timingArray[this.sID].end = new Date();
              this.whileplaying = null;
            }
          },
  	      onfinish: function(){WA.Sound._onSoundFinish(this);},
          volume: document.getElementById("volumeSlider").value //this is in flash was 75 the stikin sound control
        });
      }
    } else if(sound.readyState == 3) {
      WA.Utils.log('sound exists: ' + sound);
      this.lastPath = 15;
      //sound.onjustbeforefinish = function(){alert('here3'); WA.Sound._onSoundFinish();};
      var duration = (WA.Sound.Prefetch.prefetchRecords[string] && WA.Sound.Prefetch.prefetchRecords[string].soundlength) ? WA.Sound.Prefetch.prefetchRecords[string].soundlength : this.timingArray[string].length; 
      WA.Utils.log('finished sound: ' + this.timingArray[string].playStart.getTime() + ' ' + duration + ' ' + this.timingArray[string].orig_string);

      // Actually play the sound.
      sound.play();

      if(typeof sound.play == 'string') {
        WA.Utils.log('playing sound: ' + sound.play);
      }
    } else if(sound.readyState == 0 ||
       sound.readyState == 1) {
      sound.autoPlay = playdone;
    }
  },

  _onSoundLoad: function(sound) {
    this.timingArray[sound.sID].end = new Date();
    this.timingArray[sound.sID].length = sound.durationEstimate;
    WA.Utils.log('finished sound: ' + this.timingArray[sound.sID].end.getTime() + ' ' + sound.durationEstimate + ' ' + this.timingArray[sound.sID].orig_string);
    this.free_threads++;
    this.lastPath = 10;
    sound.didalmostfinish = false;
  },

  playLoadingSound: function() {
    return;
    soundManager.createSound({
      id: '::webanywhere-sound-effects::load',
      url: url,
      autoLoad: true,
      stream: playdone,
      autoPlay: playdone,
      onload: function() {WA.Sound._onSoundLoad(this)},
      onplay: function() {
        valPath += this.sID;
        WA.Sound.soundsPlayed++;
      },
      whileplaying: function() {
        if(this.timingArray[this.sID].end == null) {
          WA.Sound.soundsPlayed++;
          this.timingArray[this.sID].end = new Date();
          this.whileplaying = null;
        }
      },
      onfinish: function() {WA.Sound._onsoundfinish(this)},
      volume: 75 //this is for sound while loading was 75
    });
  },

  _onSoundFinish: function(sound) {
    if(sound && sound.duration) {
      var string = sound.sID;
      this.timingArray[string].length = sound.duration;
      WA.Utils.log('finished sound: ' + this.timingArray[string].playStart.getTime() + ' ' + sound.duration + ' ' + this.timingArray[string].orig_string);
    } else {
      WA.Utils.log('finished sound: ' + this.timingArray[string].end.getTime() + ' ' + sound.durationEstimate + ' ' + this.timingArray[string].orig_string);
    }

    if(WA.Sound.playing != null) {
      WA.Extensions.soundFinished(WA.Sound.playing, 1.0);

      var is_playing = WA.Sound.isPlaying(WA.Sound.playing);
      if(is_playing) {
        setTimeout(function(){WA.Sound._onsoundfinish()}, 100);
      } else if(WA.browseMode == WA.LOOPING) {
        WA.Sound.add(this.playing);
        this.playing = null;
      } else {
        this.playing = null;
        // Don't wait for timed event if there's something else to read right now.
        if(WA.browseMode == WA.READ || this.soundQ.length > 0) {
          WA.Sound.playWaiting();
        }
      }
    }
  },

  // Called after the system believes that it should be done playing a sound.
  _donePlayingEmbedSound: function() {
    WA.Utils.log('done playing: ' + this.playing);
    WA.Sound.setWhatsPlaying(null);
  },


  //
  // After all the function definitions, start initializing the system.
  //
  initSound: function() {
    this.soundMethod = this.setSoundMethod();

    if(this.soundMethod == this.FLASH_SOUND_METHOD) {
    	//alert("using flash");
      soundManager.defaultOptions = {
      'autoLoad': false,             // enable automatic loading (otherwise .load() will be called on demand with .play()..)
      'stream': true,                // allows playing before entire file has loaded (recommended)
      'autoPlay': false,             // enable playing of file as soon as possible (much faster if "stream" is true)
      'onid3': null,                 // callback function for "ID3 data is added/available"
      'onload': null,                // callback function for "load finished"
      'whileloading': null,          // callback function for "download progress update" (X of Y bytes received)
      'onplay': null,                // callback for "play" start
      'whileplaying': null,          // callback during play (position update)
      'onstop': null,                // callback for "user stop"
      'onfinish': null,              // callback function for "sound finished playing"
      'onbeforefinish': null,        // callback for "before sound finished playing (at [time])"
      'onbeforefinishtime': 5000,    // offset (milliseconds) before end of sound to trigger beforefinish..
      'onbeforefinishcomplete':null, // function to call when said sound finishes playing
      'onjustbeforefinish':null,     // callback for [n] msec before end of current sound
      'onjustbeforefinishtime':200,  // [n] - if not using, set to 0 (or null handler) and event will not fire.
      'multiShot': true,             // let sounds "restart" or layer on top of each other when played multiple times..
      'pan': 0,                      // "pan" settings, left-to-right, -100 to 100
      'volume': 100                  // self-explanatory. 0-100, the latter being the max. was 100
      }
    
      // Called when there is an error with the Flash sound player.
      // Currently, this means the the program will try to play sounds
      // using the embedded method instead.
      soundManager.onerror = function() {
        this.soundPlayerLoaded = false;
        this.soundMethod = this.EMBED_SOUND_METHOD;
        WA.Utils.log('Error loading sound player');
      }
    }
    this.addSound(wa_gettext("Welcome to Web Anywhere"));
  }
};
