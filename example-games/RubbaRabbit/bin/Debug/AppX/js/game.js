////////////////////////////////////////////////////////////////
// LUDUS: Game Starter Kit 
// for HTML5 Windows 8 Store Apps
// Version 1.0 rev.64
// by Christer (@McFunkypants) Kaitila
////////////////////////////////////////////////////////////////
// Open Source Contributions:
// TWEEN.JS for interpolating
// JAWSJS for rendering
// HOWLER for sound and music
// TILED for level editing
// OPENGAMEART for sprites
////////////////////////////////////////////////////////////////
// naming conventions proposed: FIXME! inconsistent!
// 
// CONSTANTS_ALLCAPS
// variable_names_lowercase
// functionNamesCamelCase
// ClassNamesProperCase
////////////////////////////////////////////////////////////////


// ensure that console.log doesn't cause errors on old browsers
if (typeof console == "undefined") console = { log: function () { } };

// Just to be polite, the entire game is put inside
// a closure so we don't create any public variables:
////////////////////////////////////////////////////////////////
(function () {
    ////////////////////////////////////////////////////////////////

    // let's be professionals here - throw exceptions on sloppy code
    // http://www.nczonline.net/blog/2012/03/13/its-time-to-start-using-javascript-strict-mode/
    "use strict";

    // PUBLIC class variables:

    var game_paused = 3; // [p] key to pause - also main menu mouse event
    var mute = false; // no sound at all if true

    // PRIVATE CONSTANTS

    var TILESIZE = 32; // pixel dimensions of the level spritesheet tiles
    var TILESIZEDIV2 = (TILESIZE / 2) | 0; // |0 just forces integer type
    var VIEWPORT_Y_OFFSET = 64; // nudge chase camera since it centers around player's feet

    // PRIVATE class variables:

    var debugmode = true; // true for extra info, bbox, profiler etc

    var level = []; // an array of jason level data objects
    var current_level_number = 0; // which one are we playing?
    var levelnext = 1; // used for iterating through data

    // init: remember however many levels we have in ram
    // by searching for valid global level data
    while (window['level' + levelnext]) { // data exists?
        level.push(window['level' + levelnext]);
        levelnext++;
    }
    log('Max level number: ' + (levelnext - 1));

    var need_to_draw_paused_sprite = false;
    var msgboxSprite; // used for background of "paused" and after levels / gameover screen

    var debugtileyonce = debugmode; // info about first collision
    var debugactiononce = debugmode; // info about first collision
    var debugcollisionaabb = (debugmode > 1);

    var last_touched_sprite = null; // debug only
    var last_touched_sprite_number = -999; // what spritemap tile #

    var world_complexity = 0; // current # tiles that were found in the level data

    // for bunny game, level is complete when all pickups are collected
    var pickups_remaining = 0;
    var level_complete_when_all_pickups_gone = true;
    // for castle game, level is complete when you reach EITHER "finish line" axis
    // only triggers level complete if not 0:
    var finishline_x = 0;
    var finishline_y = 0;

    // shortcuts from the global scope to private
    var tween = window.TWEEN;
    var jaws = window.jaws;
    var Howl = window.Howl;

    // simple spritesheet-based particle system
    var particles;
    var allparticleframes;
    var particle_framesize = [64, 64]; //[40,40];
    var particle_spritesheet_framecount = 32; //12;

    // if we fall too far, assume death - this value is changed by the level data
    var fell_too_far = 600;

    //invulerableUntil
    var damageInvulMS = 4000; // after getting hit we are invulnerable for this/1000 seconds

    //var titlescreen_fade_countdown = 300;
    //var titlescreen_div = null;
    var splashSprite; // the splash screen graphic used during the TitleScreenState game state
    var menuSprite; // the un-wobbly menu menu sprite overlay
    var fontSpriteSheet;
    var guiSpriteSheet;
    var PausedGUI;

    var framecount = 0;
    // these three variables are used for framerate independence
    // so that movement is the same at any FPS
    var lastframetime = 0;
    var currentFrameTimestamp = 0;
    var oneupdatetime = 1000 / 60; // how many milliseconds per simulation update
    var unsimulatedms = 0;
    var currentframems = 0;
    var simstepsrequired = 0; // how many simulation steps were required this frame?
    var fps_prev_timestamp = 0;
    var fps_prev_framecount = 0;
    var fps_framecount = 0;

    //var pixel_perfect_collision = false; // true: PIXEL_move false: TILE_move
    var use_terrain_bitmap = false; // improves FPS at cost of ram

    var health_starting_value = 1; // how many times can we be damaged before dying?
    var health_max = 1;
    var health_gui_x = 300; // changes depending on rez
    var health_gui_y = 40;
    var health_gui_spacing = 40;
    var health_spritenum = 178;

    var TimeGUI; // displays game time on the top left
    var TimeGUIlabel;
    var time_gui_x = 16;
    var time_gui_y = 16;
    var time_gui_spacing = 32;
    var time_gui_digits = 3;
    var time_gui_digits_offset = 96;
    var ScoreGUI; // displays player.score in the top middle
    var ScoreGUIlabel;
    var score_gui_x = 427; // assuming a 1366 wide window
    var score_gui_y = 16;
    var score_gui_spacing = 32;
    var score_gui_digits = 5;
    var score_gui_digits_offset = 96;
    var CountGUI; // displays number of pickups left on the top right
    var CountGUIlabel;
    var count_gui_x = 1190; // assuming a 1366 wide window
    var count_gui_y = 16;
    var count_gui_spacing = 32;
    var count_gui_digits = 2;
    var count_gui_digits_offset = 96;

    var pickup_score_amount = 25;

    // touchscreen controls
    var touchleft;
    var touchright;
    var touchattack;
    var touchjump;
    var touchpause;

    var player_can_attack = false; // game specific

    var background_colour = "#292929"; //"rgba(60,120,140, 1)";
    var titlescreen_background_colour = "#2F9D8C";
    var startx = 292; //335; //320; //40;
    var starty = 420; //1508 - 64; ////8094; //480;
    var enemy_framesize = [40, 40];
    var enemy_speed = 1; // pixels per 1/60th sec
    var player_framesize = [128, 96]; //[36,48];
    var player_scale = 1;

    // Default values: all these values are changed by the level data loader:
    // this allows up to just barely get on a platform 5 tiles high but NOT one 6 tiles high
    var jump_strength = -14.5; //-11 when 16tiles; 
    var bounce_power = -24;
    var gravity = 0.6; // 
    var max_velocity_y = 12; //8; //32/2;//15; // only used for falling, not going up
    var move_speed = 2 * 2;//6;//5;

    var gameover = 0;

    var lava;
    var use_lava = false; // the giant wall-of-spikes
    var lava_starty = 0; //8192;
    var lava_startx = -512;
    var lava_xspd = 1;
    var lava_yspd = 0;

    var heartnum;
    var parallax;
    var use_parallax_background = true;

    var touched_material;
    var sprite_sheet;
    var tile_map;

    var game_objects; // unused but nice for lava etc
    //    var game_objects_tile_map;

    var terrain;
    var terrain_canvas;
    var terrain_data;
    var viewport;

    // these defaults are reset depending on map data:
    var viewport_max_x = 10000;
    var viewport_max_y = 1000;

    var player;
    var enemies;
    var num_enemies = 0; // fixme: placed in a stupid line: use level data!

    var info_tag;
    var saved_position = [startx, starty]; // spawnpoint
    //var gate;
    //var lovely_bg;
    //var lovely_bg_canvas;

    // buffer of previous moves for follower NPCs
    var remember = false;
    var rememberframe = 0;
    var remembermax = 600;
    var rememberx = [];
    var remembery = [];
    var rememberf = [];
    var remember_npc_count = 0;

    var inventory_icon = [];
    var health_icon = [];

    // timer
    var stopwatchstring = "00s";
    var stopwatchtime = 0;
    var stopwatchstart = 0;
    var time_tag = null;

    // html5 audio simplicity: non howler test
    //var audioJump = new Audio();
    //audioJump.autoplay = true;
    //audioJump.msRealTime = true;
    //audioJump.msAudioCategory = "GameEffects";
    //audioJump.src = "game-media/jump.mp3";

    // sound functions
    var soundMusic = null;
    var soundStart = null;
    var soundJump = null;
    var soundDie = null;
    var soundPickup = null;
    var soundBounce = null;
    var soundPotion = null;
    var soundAttack = null;
    var sfxjump = function () { if (!mute && soundJump !== null) { soundJump.stop(); soundJump.play(); } };
    var sfxstart = function () { if (!mute && soundStart !== null) { soundStart.stop(); soundStart.play(); } };
    var sfxdie = function () { if (!mute && soundDie !== null) { soundDie.stop(); soundDie.play(); } };
    var sfxpickup = function () { if (!mute && soundPickup !== null) { soundPickup.stop(); soundPickup.play(); } };
    var sfxbounce = function () { if (!mute && soundBounce !== null) { soundBounce.stop(); soundBounce.play(); } };
    var sfxpotion = function () { if (!mute && soundPotion !== null) { soundPotion.stop(); soundPotion.play(); } };
    var sfxattack = function () { if (!mute && soundAttack !== null) { soundAttack.stop(); soundAttack.play(); } };

    // time how long things take to find performance bottlenecks
    // this is only done if we are in debugmode
    var profile_starts = [];
    var profile_length = [];
    var profile_maxlen = [];

    // these are put here only to force them on TOP of the info listing
    profile_start('UPDATE SIMULATION');
    profile_end('UPDATE SIMULATION');
    profile_start('DRAW EVERYTHING');
    profile_end('DRAW EVERYTHING');

    /** 
    * Records the current timestamp for a named event for benchmarking.
    * Call profile_end using the same event name to store the elapsed time
    */
    function profile_start(name) {
        if (!debugmode) return;
        profile_starts[name] = new Date().valueOf();
    }

    /** 
    * Records the end timestamp for a named event for benchmarking.
    * Call profile_start using the same event name to begin
    */
    function profile_end(name) {
        if (!debugmode) return;
        profile_length[name] = new Date().valueOf() - profile_starts[name];
        if (!profile_maxlen[name] || (profile_maxlen[name] < profile_length[name]))
            profile_maxlen[name] = profile_length[name];
    }

    /**
    * tick function for a game timer - called once per second
    */
    function stopwatchfunc() {
        // log('stopwatchfunc tick! '+stopwatchstring, true);
        if (!stopwatchstart) stopwatchstart = new Date().valueOf();
        stopwatchtime = new Date().valueOf();
        stopwatchstring = Math.floor((stopwatchtime - stopwatchstart) / 1000);
        if (time_tag) time_tag.innerHTML = "Time: " + stopwatchstring + 's';

        updateGUIsprites(TimeGUI, stopwatchstring);

        window.setTimeout(stopwatchfunc, 1000);
    }

    /**
    * spawns a spritesheet-based particle animation at these coordinates
    * implements a reuse POOL and only makes new objects when required
    */
    function startParticleSystem(x, y, particleType) {
        var p;
        if (!particleType) particleType = 0; //Math.floor(Math.random() * 6);
        // fixme: more than one at a time?
        for (var pnum = 0, pcount = particles.length; pnum < pcount; pnum++) {
            p = particles.at(pnum);
            if (p && p.inactive) {
                break;
            }
        }

        // we need a new particle!
        if (!p || !p.inactive) {
            profile_start('new particle');
            log('FIXME: we need a new particle!');
            var particle = new jaws.Sprite({ x: -999, y: -999, anchor: "center_center" });
            particle.inactive = true; // don't draw or animate
            particle.anim = []; // several kinds of animation

            // extract just enough frames for one row (32 frames)
            var pexplosion0 = allparticleframes.slice(0, particle_spritesheet_framecount - 1); // first row
            particle.anim.push(pexplosion0); // store a new kind of animation
            // another 32 frame animation)
            var pexplosion1 = allparticleframes.slice(particle_spritesheet_framecount, particle_spritesheet_framecount * 2 - 1); // second row
            particle.anim.push(pexplosion1);
            // 16 frame anims
            var pexplosion2 = allparticleframes.slice(32 + 32, 47 + 32);
            particle.anim.push(pexplosion2);
            var pexplosion3 = allparticleframes.slice(48 + 32, 63 + 32);
            particle.anim.push(pexplosion3);
            var pexplosion4 = allparticleframes.slice(64 + 32, 79 + 32);
            particle.anim.push(pexplosion4);
            var pexplosion5 = allparticleframes.slice(80 + 32, 95 + 32);
            particle.anim.push(pexplosion5);

            // remember this new particle in our system and reuse
            particles.push(particle);
            p = particle;
            profile_end('new particle');
        }

        if (p && p.inactive) {
            p.x = x;
            p.y = y;
            p.inactive = false;
            p.animation = p.anim[particleType]; // use selected anim
            p.animation.index = 0; // start anim over again
            p.animation.last_tick = (new Date()).getTime();
            p.animation.sum_tick = 0;
        }

    }

    /**
    * Extracts a portion of an image to a new canvas
    * Used for chopping up the GUI spritesheet
    * because each item has a different size and thus 
    * the jaws.Spritesheet class is insufficient
    */
    function chopImage(image, x, y, width, height) {
        var cut = document.createElement("canvas");
        cut.width = width;
        cut.height = height;
        var ctx = cut.getContext("2d");
        ctx.drawImage(image, x, y, width, height, 0, 0, cut.width, cut.height);
        return cut;
    };

    /**
   * returns a jaws sprite with pixels extracted
   * from a smaller section of the source image
   */
    function extractSprite(fromthisimage, x, y, width, height, params) {
        params = params || {};
        var extracted = chopImage(fromthisimage, x, y, width, height);
        params.image = extracted;
        return new jaws.Sprite(params);
    }

    function pauseGame(forced) {
        if (forced)
            game_paused = true;
        else // just toggle back and forth
            game_paused = !game_paused;
        log('pause toggle: ' + game_paused);
        // when we start up again, we don't want 
        // the time elapsed to be simulated suddenly
        need_to_draw_paused_sprite = true;
        lastframetime = new Date().valueOf();
        unsimulatedms = 0;
        currentframems = 0;
    }

    function unPause(e) {
        log('Unpausing the titlescreen = start the game!');
        if (game_paused == 3) game_paused = false;
    }

    /**
    * a jaws state object for the title screen
    */
    function TitleScreenState() {

        this.setup = function () {

            // if the game is running in a web page, we may want the loading screen to be invisible
            // CSS display:none, and the game will only appear when ready to play: harmless if unhidden/app.
            jaws.canvas.style.display = 'block';

            // non-blurry, blocky retro scaling if supported (faster)
            //jaws.context.mozImageSmoothingEnabled = false;

            game_paused = 3; // special paused setting: MENU MODE

            // allow keyboard input and prevent browser from getting these events
            jaws.preventDefaultKeys(["w", "a", "s", "d", "p", "space", "z", "up", "down", "right", "left"]);

            // an html gui element with the FPS
            info_tag = document.getElementById("info");

            // the main menu background
            if (!splashSprite) splashSprite = new jaws.Sprite({ image: "titlescreen.png", x: (jaws.width / 2) | 0, y: (jaws.height / 2) | 0, anchor: "center_center", flipped: false });

            // the msgbox background - used for pause screen, gameover, level transitions
            if (!msgboxSprite) msgboxSprite = new jaws.Sprite({ image: "msgbox.png", x: (jaws.width / 2) | 0, y: (jaws.height / 2) | 0, anchor: "center_center", flipped: false });

            // the numbers 0..9 in 32x32 spritesheet fontmap
            // then we can use fontSpriteSheet.frames[num]
            if (!fontSpriteSheet) fontSpriteSheet = new jaws.SpriteSheet({ image: "font.png", frame_size: [32, 32], orientation: 'down' });

            // the HUD gui sprites: score, etc.
            if (!TimeGUIlabel) TimeGUIlabel = extractSprite(fontSpriteSheet.image, 32 * 6, 32 * 15, 128, 32, { x: time_gui_x, y: time_gui_y, anchor: "top_left" });
            if (!ScoreGUIlabel) ScoreGUIlabel = extractSprite(fontSpriteSheet.image, 0, 32 * 15, 128, 32, { x: score_gui_x, y: score_gui_y, anchor: "top_left" });
            if (!CountGUIlabel) CountGUIlabel = extractSprite(fontSpriteSheet.image, 0, 32 * 16, 128, 32, { x: count_gui_x, y: count_gui_y, anchor: "top_left" });

            if (!PausedGUI) PausedGUI = extractSprite(fontSpriteSheet.image, 0, 32 * 13, 352, 32, { x: (jaws.width / 2) | 0, y: (jaws.height / 2) | 0, anchor: "center_center" });

            displayedScore = 0; // we increment displayed score by 1 each frame until it shows true player.score

            if (!TimeGUI) {
                log('creating timer gui');
                TimeGUI = new jaws.SpriteList();
                // the label
                TimeGUI.push(TimeGUIlabel);
                // eg 00000 from right to left
                for (var n = 0; n < time_gui_digits; n++) {
                    TimeGUI.push(new jaws.Sprite({ x: time_gui_x + time_gui_digits_offset + (time_gui_spacing * time_gui_digits) - (time_gui_spacing * n), y: time_gui_y, image: fontSpriteSheet.frames[0], anchor: "top_left" }));
                }
            }

            // these are sprite lists containing 0..9 digit tiles, ordered from right to left (1s, 10s, 100s, etc)
            if (!ScoreGUI) {
                log('creating score gui');
                ScoreGUI = new jaws.SpriteList();
                // the label
                ScoreGUI.push(ScoreGUIlabel);
                // eg 00000 from right to left
                for (var n = 0; n < score_gui_digits; n++) {
                    ScoreGUI.push(new jaws.Sprite({ x: score_gui_x + score_gui_digits_offset + (score_gui_spacing * score_gui_digits) - (score_gui_spacing * n), y: score_gui_y, image: fontSpriteSheet.frames[0], anchor: "top_left" }));
                }
            }

            if (!CountGUI) {
                log('creating count gui');
                CountGUI = new jaws.SpriteList();
                // the label
                CountGUI.push(CountGUIlabel);
                // eg 00000 from right to left
                for (var n = 0; n < count_gui_digits; n++) {
                    CountGUI.push(new jaws.Sprite({ x: count_gui_x + count_gui_digits_offset + (count_gui_spacing * count_gui_digits) - (count_gui_spacing * n), y: count_gui_y, image: fontSpriteSheet.frames[0], anchor: "top_left" }));
                }
            }

            // larger elements from the same image? problem: all different sizes...
            //if (!guiSpriteSheet) guiSpriteSheet = new jaws.SpriteSheet({ image: "font.png", frame_size: [352, 32], orientation: 'right' });

            // the main menu doesn't wobble
            if (!menuSprite) menuSprite = new jaws.Sprite({ image: chopImage(fontSpriteSheet.image, 0, 32 * 10, 352, 32 * 2), x: (jaws.width / 2) | 0, y: (jaws.height / 2 + 40) | 0, anchor: "center_center", flipped: false });

            liquidLayoutGUI(); // move all gui elements around in a window size independent way

            // trigger the game to start
            window.addEventListener("mousedown", unPause, false);

            // scrolling background images
            if (use_parallax_background) {
                parallax = new jaws.Parallax({ repeat_x: true, repeat_y: false });
                parallax.addLayer({ image: "parallax.png", damping: 1 });
                //parallax.addLayer({ image: "parallax2outside.png", damping: 8 });
            }

        } // title screen setup function

        // titlescreen
        this.update = function () {

            // wobble just for fun
            //splashSprite.y = (jaws.height / 2) + (Math.sin(new Date().valueOf() * 0.001) * 16);
            //splashSprite.x = (jaws.width / 2) + (Math.sin(new Date().valueOf() * 0.0005333) * 32);
            splashSprite.scaleTo(0.65 + (Math.sin(new Date().valueOf() * 0.001) / Math.PI));

            if (use_parallax_background) {
                // update parallax background scroll
                parallax.camera_x += 4;
            }

            // fixme: after gameover, debounce since you are holding down a key on prev frame!
            if (jaws.pressed("enter") ||
					jaws.pressed("up") ||
					jaws.pressed("down") ||
					jaws.pressed("left") ||
					jaws.pressed("right") ||
					jaws.pressed("space") ||
					jaws.pressed("left_mouse_button") || // never gets fired - but works in BROWSER? fixme
                    (!game_paused) // title screen done: onmousedown event only
					) {
                game_paused = false; // keyboard doesn't reset this
                sfxstart();
                current_level_number = 0; // start from the first level
                jaws.switchGameState(PlayState); // Start game!

            }


        } // title screen update function

        this.draw = function () {

            // no need to clear: parallax fills bg
            //jaws.context.fillStyle = titlescreen_background_colour;
            //jaws.context.fillRect(0, 0, jaws.width, jaws.height);

            if (use_parallax_background) {
                parallax.draw();
            }

            splashSprite.draw();

            menuSprite.draw();

        } // title screen draw function

    } // title screen state

    /**
    * a jaws state object for the display in between levels (and game over) screen
    */
    function LevelTransitionScreenState() {

        var transitionEndtime = new Date().valueOf() + 5000; // five seconds

        this.setup = function () {

        } // transition screen setup function

        // transition screen
        this.update = function () {

            if (jaws.pressed("enter") ||
					jaws.pressed("up") ||
					jaws.pressed("down") ||
					jaws.pressed("left") ||
					jaws.pressed("right") ||
					jaws.pressed("space") ||
					jaws.pressed("left_mouse_button") || // never gets fired - but works in BROWSER? fixme
                    (!game_paused) || // title screen done: onmousedown event only
                    transitionEndtime < (new Date().valueOf())
					) {
                game_paused = false; // keyboard doesn't reset this
                sfxstart();
                jaws.switchGameState(PlayState); // begin the next level

            }

        } // transition screen update function

        this.draw = function () {

            msgboxSprite.draw();

        } // transition screen draw function

    } // level transition state

    function PlayState() // in-game state 
    {

        this.setup = function () {

            profile_start("playstate setup");

            // all touchable objects like pickups
            //game_objects = new jaws.SpriteList();

            // ajax load an xml level data file
            // loadLevel('level1.tmx?'+new Date());

            // fixme
            //guiScoreSprite = new jaws.Sprite({ image: chopImage(fontSpriteSheet.image, 0, 32 * 10, 352, 32 * 2), x: (jaws.width / 2) | 0, y: (jaws.height / 2 + 40) | 0, anchor: "center_center", flipped: false });
            //guiLevelSprite = new jaws.Sprite({ image: chopImage(fontSpriteSheet.image, 0, 32 * 10, 352, 32 * 2), x: (jaws.width / 2) | 0, y: (jaws.height / 2 + 40) | 0, anchor: "center_center", flipped: false });
            // and 00000 and 0
            // and time, too?

            // init the sprite sheet tiles
            if (!sprite_sheet) sprite_sheet = new jaws.SpriteSheet({ image: "tiles.png", frame_size: [TILESIZE, TILESIZE], orientation: 'right' });

            initLevel(level[current_level_number]);

            // scrolling background images
            if (use_parallax_background) {
                parallax = new jaws.Parallax({ repeat_x: true, repeat_y: false });
                parallax.addLayer({ image: "parallax.png", damping: 4 });
                //parallax.addLayer({ image: "parallax2.png", damping: 4 });
            }

            // particle system - one explosion per sprite
            if (!particles) particles = new jaws.SpriteList();
            // every frame of every particle animation
            if (!allparticleframes) allparticleframes = new jaws.Animation({ sprite_sheet: jaws.assets.get("particles.png"), frame_size: particle_framesize, frame_duration: 40, orientation: 'right' });


            // enemy pool - these get reused during gameplay
            if (!enemies && num_enemies) {
                log('creating ' + num_enemies + ' enemies');
                enemies = new jaws.SpriteList();
                for (var nmenum = 0; nmenum < num_enemies; nmenum++) // fixme debug: level
                {
                    var anenemy = new jaws.Sprite({ x: 1000 + (nmenum * 100), y: 500 + (nmenum * 20), anchor: "center_center", flipped: true });
                    anenemy.animation = new jaws.Animation({ sprite_sheet: jaws.assets.get("enemies.png"), frame_size: enemy_framesize, frame_duration: 200, bounce: true });
                    anenemy.move_anim = anenemy.animation.slice(0, 4);
                    anenemy.setImage(anenemy.animation.frames[0]);
                    anenemy.action = dangerActionFunction;
                    anenemy.hitaction = enemyDestroyFunction;
                    enemies.push(anenemy);
                }
            }

            // our hero
            if (!player) {
                log('creating player sprite');
                player = new jaws.Sprite({ x: startx, y: starty, anchor: "center_bottom", flipped: true });

                // the animations used by our hero
                player.animation = new jaws.Animation({ sprite_sheet: jaws.assets.get("player.png"), frame_size: player_framesize, frame_duration: 75 });
                player.idle_anim = player.animation.slice(8, 9);
                player.move_anim = player.animation.slice(0, 7);
                player.jump_anim = player.animation.slice(2, 3);
                player.attack_anim = player.animation.slice(9, 14);
                player.setImage(player.animation.frames[9]);

                // the collision bounding box is smaller than the DRAWING rect
                // player.rect() is used for rendering but this is used for physics
                player.collisionrect = function () {
                    if (!this.cached_collisionrect) {
                        this.cached_collisionrect = new jaws.Rect(this.x, this.top, 32, 64);
                    }
                    this.cached_collisionrect.moveTo(this.x - this.left_offset + 48, this.y - this.top_offset + 32);
                    return this.cached_collisionrect;
                };

                // the attack bounding box is larger than the DRAWING rect
                // any enemies inside this aabb (when attacking) are destroyed
                player.attackcollisionrect = function () {
                    if (!this.cached_attackcollisionrect) {
                        this.cached_attackcollisionrect = new jaws.Rect(this.x, this.top, 128, 80);
                    }
                    this.cached_attackcollisionrect.moveTo(this.x - this.left_offset, this.y - this.top_offset + 16);
                    return this.cached_attackcollisionrect;
                };

                // skeleton test - works
                //player.animation = new jaws.Animation({sprite_sheet: jaws.assets.get("skeleton.png"), frame_size: player_framesize, frame_duration: 75, scale_image: player_scale})
                //player.idle_anim = player.animation.slice(0,1)
                //player.move_anim = player.animation.slice(0,7)
                //player.jump_anim = player.animation.slice(2,3)
                //player.setImage(player.animation.frames[0])
            }

            player.score = 0;
            player.attacking = false;
            player.invulerableUntil = 0;
            player.vx = player.vy = 0; // current movement velocity
            player.inventory_keys = 0; // any items we are holding
            player.health = health_starting_value; // how many hit points we have
            player.moveTo(startx, starty); // player might be elsewhere from a pervious game

            // the respawn particle system!
            startParticleSystem(startx, starty, 5);

            // to reduce draw calls, we COULD blit the entire visible level in one call - good for fps
            // we could also cache image data for pixel-perfect collision detection - bad for fps
            if (use_terrain_bitmap) {
                terrain = new jaws.Sprite({ x: 0, y: 0, image: "level1.png" }); // tiled level editor can export full level pixels
                terrain_canvas = terrain.asCanvas();
                terrain_data = terrain_canvas.getContext("2d").getImageData(0, 0, terrain.width, terrain.height).data;
                viewport = new jaws.Viewport({ max_x: terrain.width, max_y: terrain.height });
                jaws.activeviewport = viewport; // resize events need this in global scope
            }
            else {
                viewport = new jaws.Viewport({ max_x: viewport_max_x, max_y: viewport_max_y });
                jaws.activeviewport = viewport; // resize events need this in global scope
            }

            if (use_lava) {
                // lava
                lava = new jaws.Sprite({ x: lava_startx, y: lava_starty, image: "lava.png", collidable: true, anchor: "top_left" });
                lava.action = function (whodunnit) {
                    log('LAVA ACTION at ' + this.x + ',' + this.y, true);
                    if (whodunnit) {

                        // die!
                        die(true);
                        sfxdie();
                        // reset?

                    }
                };
                game_objects.push(lava);
            }



            // game objects: works nice
            /*
game_objects.push( new jaws.Sprite({x: 83*5, y: 131*5, image: "door.bmp", collidable: true, anchor: "top_left", scale_image: 5, door: true, energy: 20}) )
game_objects.push( new jaws.Sprite({x: 413*5, y: 972*5, image: "door.bmp", collidable: true, anchor: "top_left", scale_image: 5, door: true, energy: 20}) )
game_objects.push( new jaws.Sprite({x: 433*5, y: 972*5, image: "door.bmp", collidable: true, anchor: "top_left", scale_image: 5, door: true, energy: 20}) )
game_objects.push( new jaws.Sprite({x: 455*5, y: 972*5, image: "door.bmp", collidable: true, anchor: "top_left", scale_image: 5, door: true, energy: 20}) )
game_objects.push( new Lever({x: 755, y: 4720, anchor: "center_left", turned: false}) )
game_objects.push( new Lever({x: 755, y: 4790, anchor: "center_left", turned: false}) )
game_objects.push( new Lever({x: 755, y: 4860, anchor: "center_left", turned: false}) )
gate = new jaws.Sprite({x: 719, y: 5190, image: "gate.bmp", collidable: true, anchor: "bottom_center", scale_image: 5, gate: true})
game_objects.push( gate )
*/

            /*
// NPCs
game_objects.push( new NPC({x: 276*4, y: 142*4, anchor: "bottom_center", collidable: true, frame_offset: 8}) )
game_objects.push( new NPC({x: 486*4, y: 302*4, anchor: "bottom_center", collidable: true, frame_offset: 16}) )
game_objects.push( new NPC({x: 1374*4, y: 212*4, anchor: "bottom_center", collidable: true, frame_offset: 24}) )
game_objects.push( new NPC({x: 1770*4, y: 70*4, anchor: "bottom_center", collidable: true, frame_offset: 32}) )

// Pickups
game_objects.push( new Pickup({x: 288*4, y: 180*4, anchor: "bottom_center" }) )
game_objects.push( new Pickup({x: 756*4, y: 58*4, anchor: "bottom_center" }) )
game_objects.push( new Pickup({x: 918*4, y: 206*4, anchor: "bottom_center" }) )
game_objects.push( new Pickup({x: 1662*4, y: 64*4, anchor: "bottom_center" }) )

// inventory GUI - maybe one is enough?
inventory_icon[0] = new jaws.Sprite({x: 462, y: 32, image: "key.png", anchor: "top_left", scale_image: 2 });
*/

            // center the health gui depecding on screen size
            health_gui_x = ((jaws.width / 2) - (health_gui_spacing * 2.5)) | 0;
            for (var n = 0; n < health_max; n++) {
                health_icon[n] = new jaws.Sprite({ x: health_gui_x + (health_gui_spacing * n), y: health_gui_y, image: sprite_sheet.frames[health_spritenum], anchor: "top_left" });
            }

            // start the timer!
            if (!time_tag) time_tag = document.getElementById('time');
            stopwatchstart = 0;
            window.setTimeout(stopwatchfunc, 1000);

            profile_end("playstate setup");

            log('PlayState.setup() completed.');

        }; // end setup function

        var msg = null; // gameover screen	

        // tweak so we can access the private info
        jaws.Animation.prototype.frameNumber = function () { return (this.index); };

        /*
*
* UPDATE
*
*/
        // game simulation loop step
        this.update = function () {

            profile_start('UPDATE SIMULATION');

            if (lastframetime == 0) lastframetime = new Date().valueOf();
            currentFrameTimestamp = new Date().valueOf();
            currentframems = (currentFrameTimestamp - lastframetime);

            // allow pausing
            if (touchpause || jaws.pressed("p")) {
                // debounce: don't switch every single frame
                // while you hold down the key
                if (!this.pausetoggledelayuntil || (currentFrameTimestamp > this.pausetoggledelayuntil)) {
                    this.pausetoggledelayuntil = currentFrameTimestamp + 1000;
                    pauseGame();
                }
                else {
                    log('ignoring pause button until ' + this.pausetoggledelayuntil);
                }

            }
            if (game_paused) return;

            unsimulatedms += currentframems;
            simstepsrequired = Math.floor(unsimulatedms / oneupdatetime);
            if (simstepsrequired > 10) {
                // max out just in case 1 fps; no "hanging"
                simstepsrequired = 10;
                unsimulatedms = 0;
            }
            lastframetime = currentFrameTimestamp;

            for (var sims = 0; sims < simstepsrequired; sims++) {

                unsimulatedms -= oneupdatetime;

                if (gameover) {
                    gameover--;
                    if (gameover < 1) {
                        player.moveTo(startx, starty);
                        if (use_lava) lava.moveTo(lava_startx, lava_starty);
                        if (msg) msg.style.display = 'none';
                        stopwatchstart = 0;
                        gameover = 0;
                    }
                    else {
                        return; // do nothing
                    }
                }

                framecount++;


                // nice debug info - blah
                //if (framecount % 240 == 0)
                //{
                //	log(player.x + "," + player.y + " jumping: " + player.jumping, true)
                //}


                // WORKS RESPAWN SAVE POINT
                //savePosition(); // every frame for death respawn point?

                /*
	if (titlescreen_fade_countdown > 0)
	{
		titlescreen_fade_countdown--;
		if (!titlescreen_div) titlescreen_div = document.getElementById('titlescreen');
		if (titlescreen_div)
		{
			if (titlescreen_fade_countdown)
				titlescreen_div.style.opacity = titlescreen_fade_countdown / 300;
			else
			{
				titlescreen_div.style.display = 'none';
				// start the timer!
				if (!time_tag) time_tag = document.getElementById('time');
				window.setTimeout(stopwatchfunc,1000);
			}
		}
	}
	*/


                // move the lava up every 4th frame
                //lava.moveTo(0 /*viewport.x*/,lava_starty-Math.floor(framecount / 4));
                if (use_lava) {
                    if (framecount % 1 === 0) lava.move(lava_xspd, lava_yspd);
                }


                // animate the particles
                particles.forEach(
				function (p) {
				    if (!p.inactive) {
				        if (p.animation.atLastFrame()) {
				            //log('particle anim ended');
				            p.x = p.y = -999; // fixme: stop drawing?
				            p.inactive = true;
				        }
				        else {
				            p.setImage(p.animation.next());
				        }
				    }
				}
				);


                // animate the enemies
                // fixme optimize: only for active and onscreen...
                // x also move them
                // also collide with them
                // also destroy them
                if (enemies) {
                    enemies.forEach(
                    function (nme) {
                        nme.x -= enemy_speed;
                        nme.y += Math.sin(currentFrameTimestamp * 0.002);
                        nme.setImage(nme.move_anim.next());

                        if (!player.attacking) {
                            if (player.collisionrect().collideRect(nme.rect())) {
                                log('PLAYER HIT BY AN ENEMY!');
                                if (nme.action) nme.action(player);
                            }
                        }
                        else {
                            if (player.attackcollisionrect().collideRect(nme.rect())) {
                                log('PLAYER KILLED AN ENEMY!');
                                if (nme.hitaction) nme.hitaction(player);
                            }
                        }
                    }
                    );
                }



                if (player.jumping) { player.setImage(player.jump_anim.next()); }
                else {
                    if (player.vx) { player.setImage(player.move_anim.next()); }
                    else { player.setImage(player.idle_anim.next()); } //player.setImage( player.animation.frames[0] ) }
                }


                // attack animation can interrupt all others
                if (player_can_attack && player.attacking) {
                    player.setImage(player.attack_anim.next());
                    if (player.attack_anim.atLastFrame()) {
                        player.attacking = false;
                        log('attack completed');
                    }
                }



                if (remember) // buffer of previous moves for npc followers
                {
                    rememberframe++;
                    if (rememberframe > remembermax) rememberframe = 0;
                    rememberx[rememberframe] = player.x;
                    remembery[rememberframe] = player.y;

                    // animation "state" since frame number is private var
                    if (player.jumping) { rememberf[rememberframe] = 1; }
                    else {
                        if (player.vx < 0) { rememberf[rememberframe] = 2; }
                        else if (player.vx > 0) { rememberf[rememberframe] = 3; }
                        else { rememberf[rememberframe] = 4; }
                    }

                    //rememberf[rememberframe] = player.animation.frameNumber(); // always 0!
                    //if (rememberframe == 1)
                    //	log_object(player.animation); // debug
                    //log('player.animation.index='+player.animation.index,true);
                }

                player.vx = 0;

                // touch controls: all mousedown and touchstart etc events are already
                // being listened to by jaws - touches emulate left mouse button
                // only one touch at a time works this way (mouse only) and never fired at all in Win8 app
                /*
			touchleft = touchright = touchattack = touchjump = 0;
			if (jaws.pressed("left_mouse_button"))
			{
				// fixme: multitouch for move AND attack AND jump
				
				//jaws.mouse_y
				if (jaws.mouse_x > jaws.width/8*7) { touchjump=1; }
				else if (jaws.mouse_x > jaws.width/8*6) { touchattack=1; }
				else if (jaws.mouse_x > jaws.width/8*1) { touchright=1; }
				else { touchleft=1; }
			}
			*/


                // if this game has attacks in it, we trigger one (otherwise these keys are alternate jump keys)
                if (player_can_attack && !player.attacking && (touchattack || jaws.pressed("z") || jaws.pressed("x") || jaws.pressed("s") || jaws.pressed("space") || jaws.pressed("down"))) {
                    sfxattack();
                    player.attacking = true;
                }

                if (touchleft || jaws.pressed("left") || jaws.pressed("a")) { player.vx = -move_speed; player.flipped = 1; }
                else if (touchright || jaws.pressed("right") || jaws.pressed("d")) { player.vx = +move_speed; player.flipped = 0; }

                if (!player.attacking && (touchjump || jaws.pressed("up") || jaws.pressed("w") || jaws.pressed("space"))) { if (!player.jumping && player.can_jump) { sfxjump(); player.vy = jump_strength; player.jumping = true; player.can_jump = false; } }
                else { player.can_jump = true; }


                // DEBUG - ijkl
                if (debugmode) {
                    if (jaws.pressed("j")) { player.x -= 10; }
                    if (jaws.pressed("l")) { player.x += 10; }
                    if (jaws.pressed("i")) { player.y -= 14; }
                    if (jaws.pressed("k")) { player.y += 10; }
                }


                // collision detection with any sprites that are NOT in the tile_map (just lava for now)
                // works perfectly but slower the more objects there are
                if (game_objects) {
                    profile_start('lava physics');
                    game_objects.filter
				    (
				    function (game_object) {
				        // too conservative: allow some overlap! 
				        // return player.collisionrect().collideRect(game_object.rect());
				        return game_object.rect().collidePoint(player.x, player.y);
				    }
				    ).forEach
				    (
				    function (game_object) {
				        // trigger, if any
				        if (game_object.action) game_object.action(player);
				    }
				    );
                    profile_end('lava physics');
                }

                /*
			// way faster - never touches anything...
			if (game_objects_tile_map)
			{
				//var touches = tile_map.atRect(player.collisionrect());
				var touches = game_objects_tile_map.at(player.x,player.y);
				if (touches[0])
				{
					if (touches[0].action) touches[0].action(player);
				}
			}
			*/


                // animate all NPCs: FOLLOW the player!
                if (remember && game_objects) {
                    game_objects.filter
					(
					function (game_object) {
					    if (game_object.options.follower_num) {
					        try {
					            var frame_offset = rememberframe - (60 * game_object.options.follower_num);
					            if (frame_offset < 0) frame_offset += remembermax;
					            game_object.x = rememberx[frame_offset];
					            game_object.y = remembery[frame_offset];
					            //NOP game_object.setImage(game_object.animation.frames[rememberf[frame_offset]]);

					            if (rememberf[frame_offset] == 1) { game_object.setImage(game_object.jump_anim.next()); }
					            else {
					                if (rememberf[frame_offset] == 2) { game_object.setImage(game_object.move_anim.next()); game_object.flipped = true; }
					                else if (rememberf[frame_offset] == 3) { game_object.setImage(game_object.move_anim.next()); game_object.flipped = false; }
					                else { game_object.setImage(game_object.animation.frames[0 + game_object.options.frame_offset]); }
					            }


					        }
					        catch (anerr) {
					        }
					    }
					}
					);
                }


                // Check if all levers are turned
                // count number of levers turned
                //if( game_objects.filter( function(game_object) {return game_object.options.turned } ).length == 3) {
                //  if(!gate.moved) {
                //    gate.move(0,-80)
                //    gate.moved = true
                //  }
                //}

                // Check for game finish location
                /*
	if(player.x < 11 && player.y > 5000) {
	//if (background_audio) { background_audio.pause() }
	window.onblur = undefined
	window.onfocus = undefined
	jaws.switchGameState(OutroState)
	}
	*/

                profile_start('player physics');
                applyPhysics(player);
                touched_material = movePhysics(player);
                profile_end('player physics');

                // did we fall past the bottom of the world?
                if (player.y > fell_too_far) {
                    log('We fell too far: ' + player.y);
                    die();
                    sfxdie();
                }


                /*
				if (touched_material == "finish") {
					if (!gameover) {
						log('FINISH LINE HIT!', true);
						//sfxfinish(); 
						gameover = 240;
						msg = document.getElementById('gameover');
						if (msg) {
							msg.innerHTML = 'Congratulations!<br><br>You made it<br>in ' + stopwatchstring + ' seconds!<br><br>Can you do it<br>faster next time?';
							msg.style.display = 'block';
						}
					}
				}
				if (touched_material == "fire") { log('FIRE HIT!', true); die(); sfxdie(); }
				if (touched_material == "spike") { log('SPIKE HIT!', true); die(); sfxdie(); }
				if (touched_material == "bounce") { log('BOUNCE HIT!', true); player.vy -= bounce_power; player.jumping = true; sfxjump(); }
				if (touched_material == "push") { log('PUSH HIT!', true); player.vx += 20; } // NOP due to reset above
                */


                viewport.forceInside(player, 10);
                viewport.centerAround(player);
                viewport.y -= VIEWPORT_Y_OFFSET;

                if (use_parallax_background) {
                    // update parallax background scroll
                    parallax.camera_x = viewport.x;
                    //parallax.camera_y = viewport.y; // buggy? it works now... but the bg image only tiles horiz...
                }

                updateScoreGUI(); // every frame!? optimize? OK?

            } // end sims loop for FPS independence

            profile_end('UPDATE SIMULATION');

        }; // end update function

        /*
	// object inspector: UNUSED
	// outputs every property of an object as a string
	function log_object(obj)
	{
		var out = '';
		for (var prop in obj) 
		{
			out += prop + ': ' + obj[prop]+'; ';
		}
		log('Debug object: ' + out,true);
	}
	*/

        /*
*
* DRAW
*
*/
    function renderGUI() {

        profile_start('renderGUI');

        /* UNUSED
        for (heartnum = 0; heartnum < player.health; heartnum++) {
            if (health_icon[heartnum])
                health_icon[heartnum].draw();
        }
        //for (keynum=0; keynum < player.inventory_keys; keynum++)
        //{
        //	inventory_icon[keynum].draw();
        //}
        // are we carrying a key?
        if (player.inventory_keys) inventory_icon[0].draw();
        
        */

        if (TimeGUI) TimeGUI.draw();
        if (ScoreGUI) ScoreGUI.draw();
        if (CountGUI) CountGUI.draw();

        // touch controls gui - done in html
        /*
        jaws.context.strokeStyle = "#336633";
        var touchguih = 64;
        var touchguiw = (jaws.width/8)|0;
        var touchguiy = jaws.height-touchguih;
        jaws.context.strokeRect(0,touchguiy,touchguiw,touchguih);
        jaws.context.strokeRect(touchguiw*1,touchguiy,touchguiw,touchguih);
        jaws.context.strokeRect(touchguiw*6,touchguiy,touchguiw,touchguih);
        jaws.context.strokeRect(touchguiw*7,touchguiy,touchguiw,touchguih);
        */

        // update FPS gui once a second max so it doesn't affect fps too much
        if (info_tag) {
            fps_framecount++;
            if (currentFrameTimestamp > (fps_prev_timestamp + 1000)) {
                fps_prev_timestamp = currentFrameTimestamp;
                fps_prev_framecount = fps_framecount;
                fps_framecount = 0;

                var profilestring = '';
                if (debugmode) {
                    profilestring += ' @' + player.x + ',' + player.y;
                    for (var pname in profile_length) {
                        profilestring += '<br>' + pname + ':' + profile_length[pname] + 'ms (max:' + profile_maxlen[pname] + 'ms)';
                    }
                    if (player.jumping) profilestring += '<br>jumping';
                    profilestring += '<br>simstepsrequired: ' + simstepsrequired;
                    profilestring += '<br>unsimulatedms: ' + unsimulatedms;
                    profilestring += '<br>currentframems: ' + currentframems;
                    profilestring += '<br>last touched sprite: ' + last_touched_sprite_number;
                    //info_tag.innerHTML = "FPS: " + jaws.game_loop.fps + profilestring;
                    info_tag.innerHTML = "FPS: " + fps_prev_framecount + profilestring +
                        '<br>currentFrameTimestamp: ' + currentFrameTimestamp;
                    // + ' anim frame = ' + player.animation.frameNumber(); //+ player.animation.index;
                }
            }
        }

        //if (time_tag) time_tag.innerHTML = "Time: " + stopwatchstring;

        profile_end('renderGUI');

    } // renderGUI function


        // game render loop
        this.draw = function () {

            // when pausing, we need to render one frame first
            if (game_paused && !need_to_draw_paused_sprite) {
                return;
            }

            profile_start('DRAW EVERYTHING');

            if (use_parallax_background) {
                parallax.draw();
            }
            else {
                // we don't need to bother clearing the screen because the parallax fills entire bg
                jaws.context.fillStyle = background_colour;
                jaws.context.fillRect(0, 0, jaws.width, jaws.height);
            }

            if (tile_map) {
                if (!use_terrain_bitmap) viewport.drawTileMap(tile_map); // 6-9ms - or MORE

                //if (!use_terrain_bitmap) tile_map.drawTilesInRect({ x: viewport.x, y: viewport.y, right: viewport.x + viewport.width, bottom: viewport.y + viewport.height });

                // fixme: pickups need to be rendered separately if we use_terrain_bitmap 
            }

            viewport.apply(function () {

                if (use_terrain_bitmap) jaws.context.drawImage(terrain_canvas, 0, 0); // 3ms

                if (game_objects) game_objects.draw(); // all the non tilemap moving objects (lava) 

                player.draw();

                //enemies.draw();
                if (enemies) enemies.drawIf(viewport.isInside);

                profile_start('particles');
                particles.drawIf(viewport.isInside);
                profile_end('particles');

                //if (debugmode) player.cached_rect.draw() // debug

                if (debugcollisionaabb) player.collisionrect().draw(); // debug
                if (debugcollisionaabb && player.attacking) player.attackcollisionrect().draw(); // debug
                if (debugcollisionaabb && last_touched_sprite) last_touched_sprite.rect().draw(); // debug

            });

            renderGUI();

            if (need_to_draw_paused_sprite) {
                need_to_draw_paused_sprite = false;
                // msgboxSprite.draw(); // too big for snapped view (>320px)
                PausedGUI.draw();
            }

            profile_end('DRAW EVERYTHING');


        }; // draw

        function savePosition() {
            if (player && !player.dead && !player.jumping && player.vx === 0 && player.vy === 0) { saved_position = [player.x, player.y]; }
        }


    }

    function die(movelava) {
        player.dead = true;

        jaws.game_loop.pause();


        //$CTK//if(jaws.assets.get("die.wav"))  jaws.assets.get("die.wav").play();

        setTimeout(function () {
            if (use_lava) {
                if (movelava) lava.move(-64 * lava_xspd, -64 * lava_yspd); // shift back
            }
            player.x = saved_position[0];
            player.y = saved_position[1];
            jaws.game_loop.unpause();
            player.dead = false;

            // reset health too
            player.health = health_starting_value;

        }, 1000);
    }

    /*
function OutroState() {
	var sprite;
	var song;
	var background_audio;

	this.setup = function() {
		sprite = new jaws.Sprite({image: "outro.bmp", x: jaws.width/2, y: jaws.height, anchor: "top_center", scale_image: 3});
		
		//$CTK//
//if(playsOGG()) song = "the_escape_outro.ogg";
//else if(playsMP3()) song = "the_escape_outro.mp3";
//background_audio = jaws.assets.get(song)
//if(background_audio) {
//background_audio.addEventListener('ended', function(){ this.currentTime = 0 }, false)
//background_audio.play()
//}
	};
	this.draw = function() 
	{
		jaws.context.fillStyle = "black";
		jaws.clear();
		sprite.draw();
		sprite.y -= 0.3;
	};
}
*/







    // physics.js

    /*
function isOutsideCanvas(item) { return (item.x < 0 || item.y < 0 || item.x > jaws.width || item.y > jaws.height); }
function isCollidingWithTerrain(item) { return terrainAt(item.x, item.y); }
*/

    // simply apply gravity
    function applyPhysics(obj) {
        if (obj.vy < max_velocity_y) { obj.vy += gravity; }
    }


    /*
function movePhysics(obj)
{
	if (pixel_perfect_collision)
	{
		PIXEL_move(obj);
	}
	else
	{
		TILE_move(obj);
	}
}
*/

    function movePhysics(obj) // TILE_move sorta works! (but you can slip "thru" columns)
    {
        if (!tile_map) {
            //log('no tile map yet');
            return; // level doesn't exist yet!
        }

        var touchedtiles;
        var touched;

        // this kills "THIS" for the obj
        //var aabb;
        //if (obj.collisionrect) 
        //	aabb = obj.collisionrect;
        //else 
        //	aabb = obj.rect; 

        // fixme: IF collided then step back pixel by pixel, not entire vx/vy

        //touchedtiles = tile_map.at(obj.x,obj.y);

        /*
	if (!this.debugonce)
	{
		log(obj);
		//log(aabb()); // tonsof NaNs
		log(obj.collisionrect());
		//log(touchedtiles); // returns []
		this.debugonce = true;
	}
	*/

        //if(touchedtiles.length > 0) { obj.x -= obj.vx; }


        // Same as above but for vertical movement
        //obj.y += obj.vy;
        //touchedtiles = tile_map.atRect(obj.collisionrect());
        //if(touchedtiles.length > 0) { obj.y -= obj.vy; }

        var hit_the_ceiling = false;
        var tcount;
        var tnum;
        var hitsomethingyet; // only react to ONE non action collision per axis

        // handle vertical movement
        if (obj.vy !== 0) {

            // so you can only jump if your feet are on the ground
            obj.jumpinglastframe = obj.jumping; // debounce the dust particle etc
            obj.jumping = true; // assume we're in the air unless we touch a tile below

            hitsomethingyet = false;

            obj.y += obj.vy;

            touchedtiles = tile_map.atRect(obj.collisionrect());
            //touched = touchedtiles[0]; // only the first one
            // we might be touching more than one thing (eg a flower AND the ground)
            tcount = touchedtiles.length;
            for (tnum = 0; tnum < tcount; tnum++) {

                touched = touchedtiles[tnum];
                if (touched) {
                    //obj.vy = 0; // we just lost all vertical velocity
                    last_touched_sprite = touched;
                    // what spritemap index is this tile?
                    last_touched_sprite_number = touched.tileindex;
                    if (touched.action) // pickups, etc don't collide
                    {
                        if (debugactiononce) {
                            log('We touched something with an action!');
                            log('player rect:');
                            log(obj.collisionrect());
                            log('touched rect:');
                            log(touched.rect());
                            debugactiononce = false;
                        }
                        touched.action(obj);
                    }
                    else if (!hitsomethingyet) {
                        hitsomethingyet = true;
                        if (debugtileyonce) {
                            log('We touched a level tile!');
                            log('player rect:');
                            log(obj.collisionrect());
                            log('touched rect:');
                            log(touched.rect());
                            debugtileyonce = false;
                        }
                        // quickly move to the edge of the hit tile
                        if (obj.vy < 0) // going UP!
                        {
                            //log('collide up');
                            hit_the_ceiling = true;
                            obj.vy = 0;
                            // works but very double wobbly
                            // obj.y -= obj.y%16+1;
                            obj.y = (touched.y + touched.height + obj.height + 1) + 0;
                        }
                        else // falling down? or touching the floor: 
                        {
                            // happens CONSTANTLY when walking
                            //log('collide down');
                            //obj.y += obj.y%16-1;
                            obj.y = (touched.y - 1) | 0;

                            // no wobble if no -1 above: but then we keep touching ground-l/r
                            //obj.vy = 0; // stop accellerating down! (only issue: wobble 1px!) - max_velocity_y saves us from falling thru floor
                            //obj.y++;

                            // if we were falling befire, play "hit ground" particle effect
                            if (obj.jumping && obj.jumpinglastframe) {
                                startParticleSystem(player.x, player.y - 32, 2); // dust
                            }

                            obj.jumping = false; // we hit the floor!

                        }
                    }
                } // if touched
            } // tnum loop
        }

        // we check horiz velocity AND ensure we don't 
        // get nudged backwards when jumping in a short tunnel
        if ((obj.vx !== 0) && (!hit_the_ceiling)) {

            hitsomethingyet = false;

            obj.x += obj.vx;

            touchedtiles = tile_map.atRect(obj.collisionrect());
            tcount = touchedtiles.length;
            for (tnum = 0; tnum < tcount; tnum++) {

                touched = touchedtiles[tnum];
                if (touched) {

                    last_touched_sprite = touched;
                    if (touched.action) // pickups, etc
                    {
                        touched.action(obj);
                    }
                    else if (!hitsomethingyet) {
                        hitsomethingyet = true;

                        // quickly move to the edge of the hit tile
                        if (obj.vx > 0)// going right?
                        {
                            // wobbles but works
                            //obj.x -= obj.x%16+1;
                            //log('right side collision');
                            //log('touched.rect().left: '+touched.rect().left); // undefined
                            obj.vx = 0;

                            // works for 16 pixel tiles
                            //obj.x = (touched.x - 9)|0; // NaN? because these rects have no LEFT only right and width

                            obj.x = (touched.x - 17) | 0;

                            //log(touched.rect());
                            //log('player.left_offset: '+obj.left_offset);
                        }
                        else // going left?
                        {
                            // wibbles but works
                            // obj.x += obj.x%16-1;
                            obj.vx = 0;

                            //log('left side collision');

                            // works for 16 pixel tiles
                            //obj.x = (touched.x + 25)|0;
                            obj.x = (touched.x + 49) | 0;

                        }
                    }
                } // if touched
            } // tnum loop
        }



    }


    /*
function PIXEL_move(obj) {
	var collided_with;
// Vertical movement
	var target = Math.abs(obj.vy);
	var step = ~~(obj.vy / target);  // step will become -1 for vx < 0 and +0 for vx > 0
	for(var i=0; i < target; i++) {
		obj.y += step;
		
		var go = gameObjectAtRect(obj.rect()); // pickups etc
		
		if( terrainAt(obj.x, obj.y) || terrainAt(obj.x, obj.rect().y) || (go && go.options.collidable) ) {
			collided_with = terrainTypeAt(obj.x, obj.y);

			if(obj.vy > 0) 
			{
				// doors
				if(go && go.options.door && obj.vy > 9) 
				{
					go.options.energy -= 10;
					if(go.options.energy < 0) game_objects.remove(go);
				}
				// NPCs
				if(go && go.action) 
				{
					go.action(obj);
				}
				
				obj.jumping = false;
				
				
			}

			obj.y -= step;
			obj.vy = 0;
		}
	}

// Horizontal movement with 1-pixel "climbing" abillities
	target = Math.abs(obj.vx);
	step = ~~(obj.vx / target);
	for(var i=0; i < target; i++) {
		obj.x += step
		var go = gameObjectAtRect(obj.rect())
		if(terrainInRect(obj.x, obj.y-obj.height, 1, obj.height) || (go && go.options.collidable)) { 
			var go = gameObjectAtRect(obj.rect().move(0,-6))
			
			// NPCs
			if(go && go.action) 
			{
				go.action(obj);
			}
			
			if(!terrainInRect(obj.x, obj.y-obj.height-6, 1, obj.height) && !(go && go.options.collidable)) {
				obj.y -= 6
			}
			obj.x -= step
		}
	}
	return collided_with;
}
*/

    /*
// pixel perfect movement - this is sadly too inefficient 
// for large sprites and large speeds - gets slower when moving fast
function PIXEL_move_SLOW(obj) {
	var collided_with;
// Vertical movement
	var target = Math.abs(obj.vy)
	var step = ~~(obj.vy / target)  // step will become -1 for vx < 0 and +0 for vx > 0
	for(var i=0; i < target; i++) {
		obj.y += step
		var go = gameObjectAtRect(obj.rect())
		if( terrainAt(obj.x, obj.y) || terrainAt(obj.x, obj.rect().y) || (go && go.options.collidable) ) {
			collided_with = terrainTypeAt(obj.x, obj.y)

			if(obj.vy > 0) 
			{
				// doors
				if(go && go.options.door && obj.vy > 9) 
				{
					go.options.energy -= 10
					if(go.options.energy < 0) game_objects.remove(go);
				}
				// NPCs
				if(go && go.action) 
				{
					go.action(obj);
				}
				
				obj.jumping = false
				
				
			}

			obj.y -= step
			obj.vy = 0
		}
	}

// Horizontal movement with 1-pixel "climbing" abillities
	target = Math.abs(obj.vx)
	step = ~~(obj.vx / target)
	for(var i=0; i < target; i++) {
		obj.x += step
		var go = gameObjectAtRect(obj.rect())
		if(terrainInRect(obj.x, obj.y-obj.height, 1, obj.height) || (go && go.options.collidable)) { 
			var go = gameObjectAtRect(obj.rect().move(0,-6))
			
			// NPCs
			if(go && go.action) 
			{
				go.action(obj);
			}
			
			if(!terrainInRect(obj.x, obj.y-obj.height-6, 1, obj.height) && !(go && go.options.collidable)) {
				obj.y -= 6
			}
			obj.x -= step
		}
	}
	return collided_with;
}
*/

    /*
function gameObjectAtRect(rect) {
	var go = game_objects.filter( function(game_object) { return game_object.rect().collideRect(rect); } )[0];
	return go;
}

function gameObjectAtPoint(x, y) {
	return game_objects.filter( function(game_object) { game_object.rect().collidePoint(x, y); })[0];
}

function terrainTypeAt(x, y) {
	x = ~~(x);
	y = ~~(y);

	// byte location in array
	var ofs = ( (y-1) * terrain.width * 4) + (x*4);

	// [r,g,b,a] 0-255 https://developer.mozilla.org/En/HTML/Canvas/Pixel_manipulation_with_canvas
	// if( terrain_data[ofs] == 150 ) { return "wood"; }

	// mostly red
	if (
			( terrain_data[ofs + 0] > 250 )  &&
			( terrain_data[ofs + 1] < 10 ) &&
			( terrain_data[ofs + 2] < 10 ) 
			)
	{ return "fire"; }

	// mostly cyan
	if (
			( terrain_data[ofs + 0] < 10 )  &&
			( terrain_data[ofs + 1] > 250 ) &&
			( terrain_data[ofs + 2] > 250 ) 
			)
	{ return "spike"; }

	// mostly magenta
	if (
			( terrain_data[ofs + 0] > 250 )  &&
			( terrain_data[ofs + 1] > 250 ) &&
			( terrain_data[ofs + 2] < 10 ) 
			)
	{ return "bounce"; }

	// mostly blue
	if (
			( terrain_data[ofs + 0] < 10 )  &&
			( terrain_data[ofs + 1] < 10 ) &&
			( terrain_data[ofs + 2] > 250 ) 
			)
	{ return "bounce"; }

	// mostly white
	if (
			( terrain_data[ofs + 0] > 250 )  &&
			( terrain_data[ofs + 1] > 250 ) &&
			( terrain_data[ofs + 2] > 250 ) 
			)
	{ return "bounce"; }

	// mostly blue
	if (
			( terrain_data[ofs + 0] < 10 )  &&
			( terrain_data[ofs + 1] < 10 ) &&
			( terrain_data[ofs + 2] > 250 ) 
			)
	{ return "bounce"; }

	// mostly green
	if (
			( terrain_data[ofs + 0] < 10 ) &&
			( terrain_data[ofs + 1] > 250 ) &&
			( terrain_data[ofs + 2] < 10 )
			)
	{ return "finish"; }
	
	// mostly yellow
	if (
			( terrain_data[ofs + 0] > 250 ) &&
			( terrain_data[ofs + 1] > 250 ) &&
			( terrain_data[ofs + 2] < 10 )
			)
	{ return "push"; }

	// blue
	//if( terrain_data[( (y-1) * terrain.width * 4) + (x*4) + 2] == 255 ) { return "push"; }
	//if( terrain_data[( (y-1) * terrain.width * 4) + (x*4)] == 0 ) { return "terrain"; }
	return "";
}

function terrainAt(x, y) {
	x = ~~(x);
	y = ~~(y);
	// check the alpha - returns TRUE only if fully opaque
	try { return terrain_data[( (y-1) * terrain.width * 4) + (x*4) + 3] == 255;  }
	catch(e) { return false; }
}

function terrainInRect(x,y,width,height) {
	try {
		for(var x2 = x+width; x < x2; x++) {
			for(var y2 = y+height; y < y2; y++) {
				if(terrainAt(x, y))  return true;
			}
		}
		return false;
	}
	catch(e) { return false; }
}
*/













    // game_objects.js

    /*
function Lever(options) {
jaws.Sprite.call(this, options)
this.lever_positions = new jaws.Animation({sprite_sheet: "lever.bmp", frame_size: [5,8], scale_image: 3, bounce: true})
this.setImage( this.lever_positions.frames[0] )
this.action = function() {
if(this.options.turned == false) {
this.image = this.lever_positions.frames[1]
this.options.turned = true
}
else {
this.image = this.lever_positions.frames[0]
this.options.turned = false
}
}
}
*/


    /*
function NPC(options) 
{
	jaws.Sprite.call(this, options);

	this.animation = new jaws.Animation({sprite_sheet: jaws.assets.get("player.gif"), frame_size: [18,24], frame_duration: 50, scale_image: 2});
	this.move_anim = this.animation.slice(0+this.options.frame_offset,7+this.options.frame_offset);
	this.jump_anim = this.animation.slice(2+this.options.frame_offset,3+this.options.frame_offset);
	this.setImage(this.animation.frames[0+this.options.frame_offset]);

	this.options.frozen = true;
	
	log('NPC spawned at ' + this.x + ',' + this.y, true);
	
	// collision trigger
	this.action = function(whodunnit) 
	{
		//log('NPC ACTION at ' + this.x + ',' + this.y, true);
		if (whodunnit && whodunnit.inventory_keys && this.options.frozen)
		{
			log('NPC UNFROZEN with key#'+whodunnit.inventory_keys+' at ' + this.x + ',' + this.y, true);
			this.options.frozen = false;
			this.options.collidable = false;
			whodunnit.inventory_keys--;
			log('Remembering? ' + remember, true);
			if (remember)
			{
				remember_npc_count++;
				this.options.follower_num = remember_npc_count;
				log('NPC is follower #' + this.options.follower_num, true);
			}
			else
			{
				log('not remembering.', true);
			}
		}
	};
}


function Pickup(options) 
{
	jaws.Sprite.call(this, options);

	//this.animation = new jaws.Animation({sprite_sheet: jaws.assets.get("player.gif"), frame_size: [18,24], frame_duration: 50, scale_image: 2})
	//this.move_anim = this.animation.slice(0,7)
	//this.jump_anim = this.animation.slice(2,3)
	//this.setImage(this.animation.frames[0])

	this.animation = new jaws.Animation({sprite_sheet: jaws.assets.get("key.png"), frame_size: [24,24], frame_duration: 50, scale_image: 2});
	this.move_anim = this.animation.slice(0,1);
	this.jump_anim = this.animation.slice(0,1);
	this.setImage(this.animation.frames[0]);

	log('Pickup spawned at ' + this.x + ',' + this.y, true);
	
	// collision trigger
	this.action = function(whodunnit) 
	{
		//log('Pickup ACTION at ' + this.x + ',' + this.y, true);
		if (whodunnit)
		{
			whodunnit.inventory_keys++;
			game_objects.remove(this);
			log('Pickup grabbed at ' + this.x + ',' + this.y + ' keys left: ' + whodunnit.inventory_keys, true);
			
		}
	};
}
*/





















    // jaws is the name of the game engine
    jaws.onload = function () {
        // game entity classes inherit from sprite class
        //NPC.prototype = jaws.Sprite.prototype
        //Pickup.prototype = jaws.Sprite.prototype

        if (debugmode) jaws.assets.bust_cache = true; // ensure all gfx data is current
        jaws.assets.root = "game-media/";
        //jaws.assets.add(["level1.png","player.png","skeleton.png","parallax1.png","parallax2.png","tiles.png","lava.png"]);
        jaws.assets.add(["titlescreen.png", "font.png", "parallax.png", "player.png", "enemies.png", "particles.png", "tiles.png", "gameover.png", "msgbox.png"]);

        // also load all the sounds
        if (!mute) soundInit();

        // page is loaded: time to init the game
        initMSTouchEvents();
        jaws.start(TitleScreenState);//PlayState);
    };

    function soundInit() {
        log('soundInit...');
        profile_start('soundInit');
        // start the ambient music immediately - while downloading sprites
        soundMusic = new Howl(
		{
		    urls: ['game-media/music.mp3', 'game-media/music.ogg', 'game-media/music.wav'],
		    // this should be true but it never loops if we stream
		    buffer: false, // stream - start playing before all is downloaded: forces use of html5audio
		    autoplay: true,
		    loop: true,
		    volume: 0.5 // quieter
		});

        // load the other sound effects once images are done
        soundStart = new Howl({ urls: ['game-media/start.mp3', 'game-media/start.ogg', 'game-media/start.wav'], volume: 1.0 });
        soundJump = new Howl({ urls: ['game-media/jump.mp3', 'game-media/jump.ogg', 'game-media/jump.wav'], volume: 0.1 });
        soundDie = new Howl({ urls: ['game-media/die.mp3', 'game-media/die.ogg', 'game-media/die.wav'], volume: 1.0 });
        soundPickup = new Howl({ urls: ['game-media/pickup.mp3', 'game-media/pickup.ogg', 'game-media/pickup.wav'], volume: 1.0 });
        soundBounce = new Howl({ urls: ['game-media/bounce.mp3', 'game-media/bounce.ogg', 'game-media/bounce.wav'], volume: 1.0 });
        soundAttack = new Howl({ urls: ['game-media/attack.mp3', 'game-media/attack.ogg', 'game-media/attack.wav'], volume: 1.0 });
        profile_end('soundInit');
    }


    var noCollideActionFunction = function (whodunnit) {
    };

    var bouncyActionFunction = function (whodunnit) {
        log('boing!');
        sfxbounce();
        startParticleSystem(player.x, player.y - 32, 3); // take off 
        player.vy = bounce_power; // in case we "fall' into it, don't do +=
        player.jumping = true;
    };

    function levelComplete() {
        log('Level ' + current_level_number + ' complete!');
        current_level_number++;
        if (level[current_level_number]) {
            log('creating level ' + current_level_number);
            initLevel(level[current_level_number]);
        }
        else {
            log('no more level data: the player BEAT the game!');
            gameOver(true);
        }

    }

    function gameOver(beatTheGame) {
        log('gameOver!');
        if (beatTheGame)
            log('VICTORY!');

        jaws.switchGameState(TitleScreenState);
    }

    /** 
    * Changes the sprites used by a SpriteList (score, time, counter, etc) eg. 00000-99999
    */
    function updateGUIsprites(gui, num) {
        // individual digits
        //log('updateGUIsprites: using ' + gui.length + ' digit sprites to display: ' + num);
        var digitcount = 0;
        var digit = 0;
        var digitsprite = null;
        while (digitsprite = gui.at(digitcount+1)) { // +1 because the "label" is the first sprite
            digit = Math.floor(num % 10);
            num = Math.floor(num / 10);
            digitsprite.setImage(fontSpriteSheet.frames[digit]);
            digitcount++;
        }
    }

    var displayedScore = 0;
    /**
    * Changes the sprites used by the ScoreGUI, counting by 1 each call until we reach player.score
    */
    function updateScoreGUI() {
        if (displayedScore >= player.score) return;
        displayedScore++;

        updateGUIsprites(ScoreGUI, displayedScore);
        // works!
        /*
	    var num = displayedScore;
	    var d1 = Math.floor(num % 10);
	    num = Math.floor(num / 10);
	    var d2 = Math.floor(num % 10);
	    num = Math.floor(num / 10);
	    var d3 = Math.floor(num % 10);
	    num = Math.floor(num / 10);
	    var d4 = Math.floor(num % 10);
	    num = Math.floor(num / 10);
	    var d5 = Math.floor(num % 10);
	    //num = Math.floor(num / 10);
	    //var d6 = Math.floor(num % 10);
	    //log('player.score: ' + player.score);
	    //log('score digits: ' + d1 + ' ' + d2 + ' ' + d3 + ' ' + d4 + ' ' + d5 + ' ' + d6);
	    //ScoreGUI.at(5).setImage(fontSpriteSheet.frames[d1]);
	    ScoreGUI.at(4).setImage(fontSpriteSheet.frames[d1]);
	    ScoreGUI.at(3).setImage(fontSpriteSheet.frames[d2]);
	    ScoreGUI.at(2).setImage(fontSpriteSheet.frames[d3]);
	    ScoreGUI.at(1).setImage(fontSpriteSheet.frames[d4]);
	    ScoreGUI.at(0).setImage(fontSpriteSheet.frames[d5]);
        */
    }

    var pickupActionFunction = function (whodunnit) // added to pickup sprites in the tile_map during parseLevel
    {
        log('PICKUP ACTION at ' + this.x + ',' + this.y, true);
        if (whodunnit) {
            player.score += pickup_score_amount;
            updateScoreGUI();

            startParticleSystem(this.x + TILESIZEDIV2, this.y + TILESIZEDIV2);

            //nextnote();
            sfxpickup();
            //game_objects.remove(this);
            //tile_map.cells[col][row] = []
            var col = Math.round(this.x / tile_map.cell_size[0]);
            var row = Math.round(this.y / tile_map.cell_size[1]);
            tile_map.cells[col][row] = []; // might remove other overlapping objects, but our data has no overlap

            pickups_remaining--;
            log('pickups_remaining: ' + pickups_remaining);

            updateGUIsprites(CountGUI, pickups_remaining);

            if (level_complete_when_all_pickups_gone && (pickups_remaining < 1)) {
                log('No more pickups remain!');
                levelComplete();
            }

            if (player.health < health_max) {
                player.health++;
                // fixme: don't gobble if not needed?
                //sfxpotion();
                // reset?
            }
        }
    };

    var enemy_destroy_points = 100; // score for destroying an enemy
    var enemyDestroyFunction = function (whodunnit) {
        log('ENEMY DESTROY ACTION at ' + this.x + ',' + this.y, true);
        if (whodunnit) {
            player.score += enemy_destroy_points;
            //sfxkill(); // fixme
            startParticleSystem(this.x, this.y)
            enemies.remove(this); // take out of sprite list
            // fixme: also, destroy this sprite (or store for reuse?)
        }
    }


    // in events like these we have only global scope: no locals
    var dangerActionFunction = function (whodunnit) {
        log('DANGEROUS ACTION at ' + this.x + ',' + this.y, true);
        if (player.invulerableUntil > currentFrameTimestamp) {
            log('Currently invulnerable - damage ignored.');
        }
        if (whodunnit) {
            player.health--;
            sfxdie();

            // debounce damage (in case we touch many things in short succession)
            player.invulerableUntil = currentFrameTimestamp + damageInvulMS;

            // jump away from dangerous situation
            // fixme: debounce damage: invul_time
            // only get hit ONCE per frame (or second!)
            player.vx += jump_strength;
            player.vy += jump_strength;
            player.jumping = true;
            if (player.health < 1) {
                die(true); // not defined in this scope?
            }
        }
    };

    /**
    * inits a new level using json data: sets level specific variables and 
    * runs spawnLevel function to fill tile_map with sprites aplenty
    */
    function initLevel(leveldata) {
        profile_start('initLevel');
        log('initLevel...');
        if (!leveldata) {
            log('ERROR: Missing level data!');
            return;
        }
        if (!leveldata.properties) {
            log('ERROR: Missing level.properties!');
            return;
        }

        // clear any previous levels from memory
        tile_map = null;
        world_complexity = 0; // tile count

        // if the .js level data does not have
        // the correct structure we will get an error!
        // see the example files: we need map properties
        log('Game Name: ' + leveldata.properties.gamename);
        log('Map Name: ' + leveldata.properties.mapname);
        log('Map gravity: ' + leveldata.properties.gravity);
        log('Map jump_strength: ' + leveldata.properties.jump_strength);
        log('Map move_speed: ' + leveldata.properties.move_speed);
        log('Map start_tile: ' + leveldata.properties.start_tile);

        // fixme
        if (leveldata.properties.gravity)
            gravity = Number(leveldata.properties.gravity);

        if (leveldata.properties.jump_strength)
            jump_strength = Number(leveldata.properties.jump_strength);

        if (leveldata.properties.move_speed)
            move_speed = Number(leveldata.properties.move_speed);

        if (leveldata.properties.start_tile) {
            var startarray = String(leveldata.properties.start_tile).split(",");
            startx = parseInt(startarray[0] * leveldata.tilewidth);
            starty = parseInt(startarray[1] * leveldata.tileheight);
            //player.moveTo(startx, starty); // player is not yet inited
            saved_position = [startx, starty]; // respawn point when you die
            log('Respawn start point is: ' + startx + ',' + starty);
        }

        fell_too_far = leveldata.height * leveldata.tileheight + player_framesize[1];

        viewport_max_x = leveldata.width * leveldata.tilewidth;
        viewport_max_y = fell_too_far + 1;

        // level blocks - foreground
        spawnLevel(leveldata.layers[0].data, leveldata.width, leveldata.height);

        // pickups
        if (leveldata.layers[1]) {
            pickups_remaining = spawnLevel(leveldata.layers[1].data, leveldata.width, leveldata.height, pickupActionFunction);
            updateGUIsprites(CountGUI, pickups_remaining);
        }

        // nocollide
        if (leveldata.layers[2])
            spawnLevel(leveldata.layers[2].data, leveldata.width, leveldata.height, noCollideActionFunction);

        // bouncy
        if (leveldata.layers[3])
            spawnLevel(leveldata.layers[3].data, leveldata.width, leveldata.height, bouncyActionFunction);

        // deadly
        if (leveldata.layers[4])
            spawnLevel(leveldata.layers[4].data, leveldata.width, leveldata.height, dangerActionFunction);

        log('initLevel complete.');

        log('Total tiles in the world: ' + world_complexity)
        log('Total number of pickups: ' + pickups_remaining)

        profile_end('initLevel');
    }

    /**
    * fills tile_map with sprites as defined by json data
    * tiles can have an action function which is called on collide
    * returns the number of sprites added to the tilemap
    */
    function spawnLevel(data, width, height, actionFunction) {
        log('spawnLevel...');
        log('parsing [' + data.name + '] ' + data.length + ' array items: ' + width + 'x' + height);

        var tilesadded = 0;

        // A tilemap, each cell is TILESIZExTILESIZE pixels.
        if (!tile_map) {
            log('creating tilemap');
            tile_map = new jaws.TileMap({ size: [width, height], cell_size: [TILESIZE, TILESIZE] });
        }

        for (var i = 0; i < width; i++) {
            for (var i2 = 0; i2 < height; i2++) {

                var nextspritenum = data[i + (i2 * width)] - 1; // tile zero is the first tile in our spritesheet image

                // don't spawn empty tiles!
                if (nextspritenum > -1) {

                    tilesadded++;
                    world_complexity++;

                    var nextone = new jaws.Sprite({ image: sprite_sheet.frames[nextspritenum], x: i * TILESIZE, y: i2 * TILESIZE });

                    // for debugging and extra info
                    nextone.tileindex = nextspritenum;

                    if (actionFunction) nextone.action = actionFunction;

                    tile_map.push(nextone);
                }
            }
        }


        // Fit all items in array blocks into correct cells in the tilemap
        // Later on we can look them up really fast (see player.move)
        // ONLY PICKUPS! fixme? 
        //tile_map.push(blocks);

        // are these pickups?
        //if (params.isPickup)
        //{
        //	log('creating game_objects_tile_map for PICKUPS');
        //	if (!game_objects_tile_map) game_objects_tile_map = new jaws.TileMap({size: [width, height], cell_size: [TILESIZE,TILESIZE]});
        //	game_objects_tile_map.push(pickups);
        //	tile_map.push(pickups);
        //}

        log('done spawnLevel: ' + tilesadded + ' sprites created.');
        return tilesadded;
    }

    /*
// AJAX and XML parsing is glitchy on some browsers and platforms
// for simplicity, speed and to avoid asych race conditions,
// as well as localhost/remote permissions or connectivity issues,
// we simply include level data as a regular .js file instead
function loadLevel(filename)
{
	profile_start('download level');
	log('loadLevel '+filename);
	// testing AJAX XML level data parsing of Tiled .TMX data
	var mygetrequest = new XMLHttpRequest();
	if (mygetrequest.overrideMimeType)
	mygetrequest.overrideMimeType('text/xml'); // force mimetype in case server is silly
	mygetrequest.onreadystatechange=function()
	{
		log('ajax state change! ' + mygetrequest.readyState);
		if (mygetrequest.readyState==4)
		{
			if (mygetrequest.status==200 || window.location.href.indexOf("http")==-1)
			{
				profile_end('download level');
				profile_start('parse level');
				//var jsondata=eval("("+mygetrequest.responseText+")"); //retrieve result as an JavaScript object
				log('Got DATA');
				//log(mygetrequest.responseText);
				var xmldata=mygetrequest.responseXML; //retrieve result as an XML object
				
				log(mygetrequest.responseText);
				
				var maps=xmldata.getElementsByTagName("map");
				// IE bug: works in all browsers except IE: mimetype bug?
				var layers = maps[0].getElementsByTagName("layer"); // IE bug
				for (n=0; n<layers.length; n++)
				{
					if (layers[n].attributes)
					{
						log('we have layer '+n+' attribs!');
						layername = layers[n].attributes.getNamedItem("name").value;
						layerwidth = layers[n].attributes.getNamedItem("width").value;
						layerheight = layers[n].attributes.getNamedItem("height").value;
						log('name='+layername);
						log('width='+layerwidth);
						log('height='+layerheight);
						levels = layers[n].getElementsByTagName("data");
						leveldata = levels[0].childNodes[0].nodeValue;
						leveldata = (''+leveldata).split(","); // turn into a string and then an array of numbers
						//log('data string='+leveldata);
						spawnLevel(leveldata,layerwidth,layerheight,(n>0));
					}
				}
				profile_end('parse level');
			}
			else{
				alert("An error has occured making the AJAX xml request")
			}
		}
	}
	//alert('Testing ajax json...');
	mygetrequest.open("GET", "media/" + filename, true);
	mygetrequest.send(null); // fixme: is this required?
	log('loadLevel '+filename+' done.');
}
*/

    /*
        var piano = [];
        piano['a'] = new Howl({urls:['game-media/piano-a.wav'], volume: 1.0});
        piano['b'] = new Howl({ urls: ['game-media/piano-b.wav'], volume: 1.0 });
        piano['c'] = new Howl({ urls: ['game-media/piano-cs.wav'], volume: 1.0 });
        piano['d'] = new Howl({ urls: ['game-media/piano-d.wav'], volume: 1.0 });
        piano['ds'] = new Howl({ urls: ['game-media/piano-eb.wav'], volume: 1.0 });
        piano['e'] = new Howl({ urls: ['game-media/piano-e.wav'], volume: 1.0 });
        piano['f'] = new Howl({ urls: ['game-media/piano-f.wav'], volume: 1.0 });
        piano['g'] = new Howl({ urls: ['game-media/piano-g.wav'], volume: 1.0 });
    
        // Fur Elise
        var noteindex = 0;
        var notes = 
        ['e','ds','e','ds','e','b','d','c','a',
        'c','e','a','b','e','a','b','c',
        'e','ds','e','ds','e','b','d','c','a',
        'c','e','a','b','e','c','b','a',
        'b','c','d','e','g','f','e','d','e','e','d','c','e','d','c','e',
        'e','ds','e','ds','e','e','d','c','a',
        'c','e','a','b','e','a','b','c',
        'e','ds','e','ds','e','b','d','c','a',
        'c','e','a','b','e','c','b','a'];
        function nextnote()
        {
            var nn = notes[noteindex];
            if (nn)
            {
                log('next note: '+nn);
                noteindex++;
                if (piano[nn]) {
                    piano[nn].stop();
                    piano[nn].play();
                }
            }
            else
            {
                log('We ran out of notes in the song!');
                noteindex = 0;
                nextnote();
            }
        }
    */

    function log(str) {
        if (!debugmode) return;
        // output the message for debugging
        console.log(str);
        //jaws.log(str);
    }


    // optimized version of function from line 2459 in jaws.js
    // the main limitation imposed is only ONE tile per tile location (jaws version allows array)
    /** Returns occupants of all cells touched by 'rect' */
    jaws.TileMap.prototype.atRect = function (rect) {
        var objects = []
        var items

        try {
            var from_col = ~~(rect.x / this.cell_size[0])
            if (from_col < 0) {
                from_col = 0
            }
            var to_col = ~~(rect.right / this.cell_size[0])
            if (to_col >= this.size[0]) {
                to_col = this.size[0] - 1
            }
            var from_row = ~~(rect.y / this.cell_size[1])
            if (from_row < 0) {
                from_row = 0
            }
            var to_row = ~~(rect.bottom / this.cell_size[1])
            if (to_row >= this.size[1]) {
                to_row = this.size[1] - 1
            }

            for (var col = from_col; col <= to_col; col++) {
                for (var row = from_row; row <= to_row; row++) {
                    //this.cells[col][row].forEach(function (item, total) {
                    //    if (objects.indexOf(item) == -1) { objects.push(item) }
                    //})
                    if (this.cells[col][row][0]) objects.push(this.cells[col][row][0]);
                }
            }
        }
        catch (e) {
            // ... problems
        }
        return objects
    }

    jaws.TileMap.prototype.drawTilesInRect = function (rect) {
        //var objects = []
        //var items

        //try {
        var from_col = ~~(rect.x / this.cell_size[0])
        if (from_col < 0) {
            from_col = 0
        }
        var to_col = ~~(rect.right / this.cell_size[0])
        if (to_col >= this.size[0]) {
            to_col = this.size[0] - 1
        }
        var from_row = ~~(rect.y / this.cell_size[1])
        if (from_row < 0) {
            from_row = 0
        }
        var to_row = ~~(rect.bottom / this.cell_size[1])
        if (to_row >= this.size[1]) {
            to_row = this.size[1] - 1
        }

        for (var col = from_col; col <= to_col; col++) {
            for (var row = from_row; row <= to_row; row++) {
                //this.cells[col][row].forEach(function (item, total) {
                //    if (objects.indexOf(item) == -1) { objects.push(item) }
                //})
                //if (this.cells[col][row][0]) objects.push(this.cells[col][row][0]);

                if (this.cells[col][row][0]) this.cells[col][row][0].draw();

            }
        }
        //}
        //catch (e) {
        //    // ... problems
        //}
        //return objects
    }

    log('Platformer Game Engine Startup...');

    function touchButtonLeft(e) {
        log('touchButtonLeft');
        touchleft = true;
    }
    function touchButtonRight(e) {
        log('touchButtonRight');
        touchright = true;
    }
    function touchButtonDown(e) {
        log('touchButtonDown');
        touchattack = true;
    }
    function touchButtonUp(e) {
        log('touchButtonUp');
        touchjump = true;
    }
    function untouchButtonLeft(e) {
        log('untouchButtonLeft');
        touchleft = false;
    }
    function untouchButtonRight(e) {
        log('untouchButtonRight');
        touchright = false;
    }
    function untouchButtonDown(e) {
        log('untouchButtonDown');
        touchattack = false;
    }
    function untouchButtonUp(e) {
        log('untouchButtonUp');
        touchjump = false;
    }

    function initMSTouchEvents() {

        var lbutt = document.getElementById('buttonleft');
        var dbutt = document.getElementById('buttondown');
        var rbutt = document.getElementById('buttonright');
        var ubutt = document.getElementById('buttonup');

        if (window.navigator.msPointerEnabled) {
            log('MS pointer events are enabled.');
            if (lbutt) lbutt.addEventListener("MSPointerDown", touchButtonLeft, false);
            if (rbutt) rbutt.addEventListener("MSPointerDown", touchButtonRight, false);
            if (dbutt) dbutt.addEventListener("MSPointerDown", touchButtonDown, false);
            if (ubutt) ubutt.addEventListener("MSPointerDown", touchButtonUp, false);

            if (lbutt) lbutt.addEventListener("MSPointerUp", untouchButtonLeft, false);
            if (rbutt) rbutt.addEventListener("MSPointerUp", untouchButtonRight, false);
            if (dbutt) dbutt.addEventListener("MSPointerUp", untouchButtonDown, false);
            if (ubutt) ubutt.addEventListener("MSPointerUp", untouchButtonUp, false);
        }
        if (window.navigator.msMaxTouchPoints) { log('MS touches (x' + window.navigator.msMaxTouchPoints + ' points max) are enabled.'); }
        // dont't let any mouse/touch select things: this is a game
        document.addEventListener("selectstart", function (e) { e.preventDefault(); }, false);
        // dont't let touch-and-hold (or right click) create a context menu
        document.addEventListener("contextmenu", function (e) { e.preventDefault(); }, false);
        // don't show the hint visual for context menu either
        document.addEventListener("MSHoldVisual", function (e) { e.preventDefault(); }, false);

        // make the touch controls visible
        if (lbutt) lbutt.style.display = 'block';
        if (rbutt) rbutt.style.display = 'block';
        if (dbutt) dbutt.style.display = 'block';
        if (ubutt) ubutt.style.display = 'block';

        log('initMSTouchEvents completed.');
    }

    /**
    * moves all GUI sprites around depending on window size
    */
    function liquidLayoutGUI() {
        log('liquidLayoutGUI');
        // move any msgboxes/GUIs that are centered:
        if (menuSprite) menuSprite.moveTo((jaws.width / 2) | 0, (jaws.height / 2 + 40) | 0);
        if (splashSprite) splashSprite.moveTo((jaws.width / 2) | 0, (jaws.height / 2) | 0);
        if (msgboxSprite) msgboxSprite.moveTo((jaws.width / 2) | 0, (jaws.height / 2) | 0);
        if (PausedGUI) PausedGUI.moveTo((jaws.width / 2) | 0, (jaws.height / 2) | 0);
        // move the gui timer/score/count
        if (TimeGUIlabel) TimeGUIlabel.moveTo(time_gui_x, time_gui_y);
        if (ScoreGUIlabel) ScoreGUIlabel.moveTo(jaws.width - 1366 + score_gui_x, score_gui_y);
        if (CountGUIlabel) CountGUIlabel.moveTo(jaws.width - 1366 + count_gui_x, count_gui_y);
        // top left
        if (TimeGUI) {
            for (var n = 0; n < time_gui_digits; n++) {
                TimeGUI.at(n+1).moveTo(time_gui_x + time_gui_digits_offset + (time_gui_spacing * time_gui_digits) - (time_gui_spacing * n), time_gui_y);
            }
        }
        // top center
        if (ScoreGUI) {
            for (var n = 0; n < score_gui_digits; n++) {
                ScoreGUI.at(n + 1).moveTo(jaws.width - 1366 + score_gui_x + score_gui_digits_offset + (score_gui_spacing * score_gui_digits) - (score_gui_spacing * n), score_gui_y);
            }
        }
        // top right
        if (CountGUI) {
            for (var n = 0; n < count_gui_digits; n++) {
                CountGUI.at(n+1).moveTo(jaws.width - 1366 + count_gui_x + count_gui_digits_offset + (count_gui_spacing * count_gui_digits) - (count_gui_spacing * n), count_gui_y);
            }
        }
    }

    function onResize(e) {
        log('onResize!');
        log('window size is now ' + window.innerWidth + 'x' + window.innerHeight);
        // for example, on a 1366x768 tablet, swiped to the side it is 320x768
        jaws.canvas.width = window.innerWidth - 160;
        jaws.canvas.height = window.innerHeight - 160;
        jaws.width = jaws.canvas.width;
        jaws.height = jaws.canvas.height;
        if (viewport) viewport.width = jaws.canvas.width;
        if (viewport) viewport.height = jaws.canvas.height;

        liquidLayoutGUI();

        //if ((jaws.width < jaws.height) && (jaws.width < 480)) // in docked side view?
        // we always want to pause on screen resize: from small to big, etc.
        {
            pauseGame(true);
        }

    }

    // fixme: put inside a nice init function alongside many other things.
    window.addEventListener("resize", onResize, false);

    /** 
    * OPTIMIZATION EXPERIMENT - nah it is useless...
    * This dangerous (no error checking!) function
    * replaces the much better (but slightly slower) version in jaws.js
    * it assumes the sprite has an image, no rotation and opaque alpha
    * using this version increases FPS by 1
    */
    /*
    jaws.Sprite.prototype.draw = function () {
        if (!this.image) { return this } // sometimes a new particle spawns requires this line
        //if (this.dom) { return this.updateDiv() }
        this.context.save()
        this.context.translate(this.x, this.y)
        //if (this.angle != 0) { jaws.context.rotate(this.angle * Math.PI / 180) }
        this.flipped && this.context.scale(-1, 1)
        //this.context.globalAlpha = this.alpha // removed as this is called a LOT
        this.context.translate(-this.left_offset, -this.top_offset) // Needs to be separate from above translate call cause of flipped
        this.context.drawImage(this.image, 0, 0, this.width, this.height)
        this.context.restore()
        return this
    }
    */




    // this line ends the closure and runs the code inside
})();

