////////////////////////////////////////////////////////////////
// LUDUS HTML5 Platformer Game Starter Kit for Windows 8 Store
// Version 1.4 rev.179 (MIT license)
// by Christer (@McFunkypants) Kaitila (http://mcfunkypants.com)
////////////////////////////////////////////////////////////////
// Source: https://github.com/mcfunkypants/ludus
// Demos: http://www.mcfunkypants.com/ludus
////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////
// I gratefully acknowledge the following open source projects:
////////////////////////////////////////////////////////////////
// JAWSJS canvas engine by Ippa Lix (LGPL license)
// - Source: https://github.com/ippa/jaws
// - Demos and documentation: http://www.jawsjs.com
////////////////////////////////////////////////////////////////
// HOWLERJS sound engine by James Simpson (MIT license)
// - Source: (https://github.com/goldfire/howler.js)
// - Demos and documentation: http://www.howlerjs.com
////////////////////////////////////////////////////////////////
// TWEENJS engine by sole, mrdoob, et al (MIT license)
// - Source and demos: https://github.com/sole/tween.js
////////////////////////////////////////////////////////////////
// TILED map editor by Thorbjørn Lindeijer
// - Source: https://github.com/bjorn/tiled
// - Download: http://www.mapeditor.org
////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////
// Informal summary of licenses: you can use/modify ludus.js
// for any purpose, free or commercial, and do not have to 
// make your project open source. Enjoy! Please give credit.
////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////
// The artwork in the example games is CC-BY (attribution)
// Please refer to the main menu credits button for details.
// If you reuse these assets, give credit - they deserve it!
////////////////////////////////////////////////////////////////
// Gwendolynn World Tiles: Richard "Jetrel" Kettering
// Gwendolynn World Tiles: Carl "Surt" Olsson
// Gwendolynn Characters: Richard "Jetrel" Kettering
// Gwendolyn Music: Zero Project
// Rubba Rabbit World Tiles: Carl "Surt" Olsson
// Rubba Rabbit Character: Stephen "Redshrike" Challener
// Rubba Rabbit Music: Christer "McFunkypants" Kaitila
// Pickups (fruit/treasure) icons: Henrique "7Soul" Lazarini
// GUI, Particles, other art: Christer "McFunkypants" Kaitila
////////////////////////////////////////////////////////////////

/*
Ludus.js uses The MIT License

Copyright (c) 2013 by Christer Kaitila

    Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

////////////////////////////////////////////////////////////////
// Just to be polite, the entire game is put inside
// a closure so we don't create any public variables:
////////////////////////////////////////////////////////////////
(function () {

    // throw exceptions on sloppy code
    "use strict";

    // debug
    var debugmode = 0; // 1 for debug info and profiler, >1 for bbox draw
    var debugtileyonce = debugmode; // log detailed info about first collision
    var debugactiononce = debugmode; // log the 1st touched tile that has an "action" (pickup, etc)
    var debugcollisionaabb = (debugmode > 1); // should we draw red rectangles?
    var last_touched_sprite = null; // for debugging collision detection only
    var last_touched_sprite_number = -999; // what spritemap tile # did we last touch?
    var world_complexity = 0; // current # tiles that were found in the level data - used for debugging only
    var profile_starts = []; // for debug only: performance PROFILER
    var profile_length = []; // time how long things take to find performance bottlenecks
    var profile_maxlen = []; // this is only done if we are in debugmode
    var info_tag; // debug only: the FPS and performance stats DOM element

    // shortcuts from the global scope
    var tween = window.TWEEN; // handy for animation interpolation
    var jaws = window.jaws; // the jawsjs canvas api
    var Howl = window.Howl; // a cross-browser sound api
    var console = window.console; // the debug console
    if (typeof console == "undefined") console = { log: function () { } }; // for old browsers

    // sprites aplenty
    var player; // the game player animated sprite
    var player_framesize = [128, 96]; // pixel dimensions of the player sprite
    var saved_position = [startx, starty]; // respawn point on death
    var enemies; // a sprite list filled with enemies
    var enemy_framesize = [40, 40]; // pixel dimensions of the enemy sprite (if any)
    var enemy_destroy_points = 100; // score for destroying an enemy
    var num_enemies = 0; // depends on the enemies layer in the level data
    var sprite_sheet; // the level tile map's data sprite sheet image
    var tile_map; // the tile map (array of sprites) that contains the entire level
    var use_parallax_background = true; // draw the looped bg
    var parallax; // the scrolling background during gameplay
    var titleparallax; // the background during titlescreen and transitions

    // simple spritesheet-based particle system
    var particles_enabled = true;
    var particles; // a SpriteList containing all of them
    var allparticleframes; // contains every sprite in the particle spritesheet
    var particle_framesize = [64, 64]; // pixel dimensions of each particle anim
    var particle_spritesheet_framecount = 32; // spritesheet frames per anim

    // timer
    var game_paused = 3; // 0=playing 1=paused 3=mainmenu
    var game_timer; // set by SetInterval for the stopwatchfunc
    var game_over = true; // are we currently playing?
    var framecount = 0;
    var lastframetime = 0;
    var currentFrameTimestamp = 0;
    var oneupdatetime = 1000 / 60; // how many milliseconds per simulation update
    var unsimulatedms = 0; // used for framerate independence
    var currentframems = 0; // so that movement is the same at any FPS
    var simstepsrequired = 0; // how many simulation steps were required this frame?
    var fps_prev_timestamp = 0;
    var fps_prev_framecount = 0;
    var fps_framecount = 0;
    var stopwatchtime = 0;
    var stopwatchstart = 0;

    // levels
    var level = []; // an array of jason level data objects
    var starting_level_number = 0; // should be zero except when testing
    var current_level_number = starting_level_number; // which one are we playing?
    var pendingLevelComplete = false; // do we need to change levels next frame?
    var levelnext = 1; // used for iterating through .js data globals (eg. window.level1)
    var TILESIZE = 32; // pixel dimensions of the level spritesheet tiles
    var TILESIZEDIV2 = (TILESIZE / 2) | 0; // |0 just forces integer type

    // viewport
    var viewport; // the visible game world that scrolls around with player in the center
    var viewport_max_x = 10000; // these defaults are overwritten...
    var viewport_max_y = 1000; // ...depending on map data
    var VIEWPORT_Y_OFFSET = 64; // nudge chase camera since it centers around player's feet

    // transitions between levels
    var transitionEndtime;
    var transition_mode;
    var TRANSITION_LEVEL_COMPLETE = 0;
    var TRANSITION_GAME_OVER = 1;
    var TRANSITION_LENGTH_MS = 5000; // five seconds

    // gameplay settings
    var pickups_remaining = 0; // current number of pickups left in the level
    var pickups_total = 0; // in the current level before any were picked up
    var level_complete_when_all_pickups_gone = false; // default: something else will trigger it
    var gameover_when_time_runs_out = false; // default: play forever
    var time_remaining = 0; // default: take your time and count up
    var time_direction = 1; // default: count up and never die based on time
    var fell_too_far = 600; // if we fall too far, assume death - this value is changed by the level data
    var damageInvulMS = 4000; // after getting hit we are invulnerable for this/1000 seconds
    var health_starting_value = 1; // how many times can we be damaged before dying?
    var health_max = 1;
    var health_gui_x = 300; // changes depending on rez
    var health_gui_y = 40;
    var health_gui_spacing = 40;
    var health_spritenum = 178;
    var pickup_score_amount = 25; // how many points we get for touching a pickup
    var player_can_attack = false; // game specific - is there an attack button? SET IN initLevel based on json data
    var startx = 292; // changed by the level data
    var starty = 420;
    var enemy_speed = 2; // pixels per 1/60th sec
    var jump_strength = -14.5; // this allows up to just barely get on a platform 5 tiles high but NOT one 6 tiles high
    var bounce_power = -24;
    var gravity = 0.6; // Default values: all these values are changed by the level data loader:
    var max_velocity_y = 12; // only used for falling, not going up
    var move_speed = 2 * 2;

    // gui
    var need_to_draw_paused_sprite = false; // if we pause, render one more frame with PAUSED drawn on it
    var msgboxSprite; // used for background of "paused" and after levels / gameover screen
    var creditsSprite; // on overlay image with all the credits / about screen
    var fontSpriteSheet; // the numbers 0..9
    var guiSpriteSheet; // GUI overlays like the credits screen 
    var splashSprite; // the splash screen graphic used during the TitleScreenState game state
    var menuSprite; // the un-wobbly menu menu sprite overlay
    var levelcompleteSprite; // the words "level complete - player one get ready"
    var gameoverSprite; // the words "game over"
    var outOfTimeSprite; // the game over description for failure
    var beatTheGameSprite; // the game over desciption for beating the game
    var hurryUpSprite; // flashing info near timer
    var findEmAllSprite; // flashing info near counter
    var menu_item_selected = 0; // 0=PLAY 1=CREDITS
    var titleframecount = 0; // used for simple menu particle animation
    var showing_credits = false; // used in TitleScreenState
    var noKeysPressedLastFrame = true; // only react to new keydowns
    var CREDITS_BUTTON_Y = 392; // default: gets changed in liquidLayoutGUI
    var gui_enabled = true; // score/time/count - if false no GUI at all
    var PausedGUI; // a sprite with the word "paused"
    var TimeGUI; // displays game time on the top left
    var TimeGUIlabel; // "time left" etc.
    var time_gui_x = 8;
    var time_gui_y = 8;
    var time_gui_spacing = 24;
    var time_gui_digits = 3;
    var time_gui_digits_offset = 82;
    var ScoreGUI; // displays player.score in the top middle
    var ScoreGUIlabel; // "1UP:" or "Score:"
    var displayedScore = 0; // we animate the score GUI just for fun
    var score_gui_x = -104; // starts at the 50% middle
    var score_gui_y = 8;
    var score_gui_spacing = 24;
    var score_gui_digits = 5;
    var score_gui_digits_offset = 56;
    var CountGUI; // displays number of pickups left on the top right
    var CountGUIlabel; // "# pickups remaining"
    var count_gui_x = -116; // starting from RIGHT edge
    var count_gui_y = 8;
    var count_gui_spacing = 24;
    var count_gui_digits = 3;
    var count_gui_digits_offset = -102;
    
    // touchscreen control states
    var touchleft;
    var touchright;
    var touchattack;
    var touchjump;
    var touchpause;
    // the actual touchable buttons on screen
    var lbutt;
    var dbutt;
    var rbutt;
    var ubutt;
    var pbutt;

    // sound
    var mute = false; // no sound at all if true
    // sound data
    var soundMusic = null;
    var soundStart = null;
    var soundJump = null;
    var soundDie = null;
    var soundPickup = null;
    var soundBounce = null;
    var soundPotion = null;
    var soundAttack = null;
    var soundHitEnemy = null;
    var soundVictory = null;
    var soundDefeat = null;
    // sound functions
    var sfxjump = function () { if (!mute && soundJump !== null) { soundJump.stop(); soundJump.play(); } };
    var sfxstart = function () { if (!mute && soundStart !== null) { soundStart.stop(); soundStart.play(); } };
    var sfxdie = function () { if (!mute && soundDie !== null) { soundDie.stop(); soundDie.play(); } };
    var sfxpickup = function () { if (!mute && soundPickup !== null) { soundPickup.stop(); soundPickup.play(); } };
    var sfxbounce = function () { if (!mute && soundBounce !== null) { soundBounce.stop(); soundBounce.play(); } };
    var sfxpotion = function () { if (!mute && soundPotion !== null) { soundPotion.stop(); soundPotion.play(); } };
    var sfxattack = function () { if (!mute && soundAttack !== null) { soundAttack.stop(); soundAttack.play(); } };
    var sfxvictory = function () { if (!mute && soundVictory !== null) { soundVictory.stop(); soundVictory.play(); } };
    var sfxdefeat = function () { if (!mute && soundDefeat !== null) { soundDefeat.stop(); soundDefeat.play(); } };
    var sfxhitenemy = function () { if (!mute && soundHitEnemy !== null) { soundHitEnemy.stop(); soundHitEnemy.play(); } };

    ////////////////////////////////////////////////////////////////
    // Ludus Functions Begin Here
    ////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////
    // GAME STATE: THE TITLE SCREEN
    ////////////////////////////////////////////////////////////////
    /**
    * A jaws state object for a simplistic title screen.
    * Note that many inits are performed for sprites that are used
    * by the other states; if you remove the titlescreen,
    * be sure to create these sprites elsewhere.
    */
    function TitleScreenState() {

        /**
        * init function for the titlescreen state
        * also used to create sprites on first run
        */
        this.setup = function () {

            // used only for the particle decorations
            titleframecount = 0;

            // even if touch is supported, we don't want the buttons visible here
            touchControlsVisible(false);

            // if the game is running in a web page, we may want the loading screen to be invisible
            // CSS display:none, and the game will only appear when ready to play: harmless if unhidden/app.
            jaws.canvas.style.display = 'block';

            game_paused = 3; // special paused setting: MENU MODE

            // allow keyboard input and prevent browser from getting these events
            jaws.preventDefaultKeys(["w", "a", "s", "d", "p", "space", "z", "up", "down", "right", "left"]);

            // an html gui element (using the DOM!) with the FPS and debug profile stats
            info_tag = document.getElementById("info");

            // the main menu background
            if (!splashSprite) splashSprite = new jaws.Sprite({ image: "titlescreen.png", x: (jaws.width / 2) | 0, y: (jaws.height / 2) | 0, anchor: "center_center" });

            // the msgbox background - used for pause screen, gameover, level transitions
            if (!msgboxSprite) msgboxSprite = new jaws.Sprite({ image: "msgbox.png", x: (jaws.width / 2) | 0, y: (jaws.height / 2) | 0, anchor: "center_center" });

            // the numbers 0..9 in 32x32 spritesheet fontmap
            // then we can use fontSpriteSheet.frames[num]
            if (!fontSpriteSheet) fontSpriteSheet = new jaws.SpriteSheet({ image: "font.png", frame_size: [32, 32], orientation: 'down' });

            // the gui image has all sorts of labels, the credits screen, etc.
            if (!guiSpriteSheet) guiSpriteSheet = new jaws.Sprite({ image: "gui.png" });

            // the credits screen
            if (!creditsSprite) creditsSprite = extractSprite(guiSpriteSheet.image, 0, 32 * 17, 352, 224, { x: (jaws.width / 2) | 0, y: ((jaws.height / 2) | 0) - 8, anchor: "center_center" });

            // particle system - one explosion per sprite
            if (particles_enabled) {
                if (!particles) particles = new jaws.SpriteList();
                // every frame of every particle animation
                if (!allparticleframes) allparticleframes = new jaws.Animation({ sprite_sheet: jaws.assets.get("particles.png"), frame_size: particle_framesize, frame_duration: 40, orientation: 'right' });
            }

            displayedScore = 0; // we increment displayed score by 1 each frame until it shows true player.score

            // the HUD gui sprites: score, etc.
            if (gui_enabled) {
                if (!TimeGUIlabel) TimeGUIlabel = extractSprite(guiSpriteSheet.image, 32 * 6, 32 * 15, 128, 32, { x: time_gui_x, y: time_gui_y, anchor: "top_left" });
                if (!ScoreGUIlabel) ScoreGUIlabel = extractSprite(guiSpriteSheet.image, 0, 32 * 15, 128, 32, { x: score_gui_x, y: score_gui_y, anchor: "top_left" });
                if (!CountGUIlabel) CountGUIlabel = extractSprite(guiSpriteSheet.image, 0, 32 * 16, 128, 32, { x: count_gui_x, y: count_gui_y, anchor: "top_left" });
                if (!PausedGUI) PausedGUI = extractSprite(guiSpriteSheet.image, 0, 32 * 13, 352, 32, { x: (jaws.width / 2) | 0, y: (jaws.height / 2) | 0, anchor: "center_center" });

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
            } // if (gui_enabled) 

            // create all the sprites used by the GUI
            if (!menuSprite) menuSprite = new jaws.Sprite({ image: chopImage(guiSpriteSheet.image, 0, 32 * 10, 352, 32 * 2), x: (jaws.width / 2) | 0, y: (jaws.height / 2 + 40) | 0, anchor: "center_center", flipped: false });
            if (!levelcompleteSprite) levelcompleteSprite = new jaws.Sprite({ image: chopImage(guiSpriteSheet.image, 0, 0, 352, 128), x: (jaws.width / 2) | 0, y: (jaws.height / 2) | 0, anchor: "center_center", flipped: false });
            if (!gameoverSprite) gameoverSprite = new jaws.Sprite({ image: chopImage(guiSpriteSheet.image, 0, 128, 352, 64), x: (jaws.width / 2) | 0, y: ((jaws.height / 2) | 0) - 42, anchor: "center_center", flipped: false });
            if (!outOfTimeSprite) outOfTimeSprite = new jaws.Sprite({ image: chopImage(guiSpriteSheet.image, 0, 192, 352, 64), x: (jaws.width / 2) | 0, y: ((jaws.height / 2) | 0) + 42, anchor: "center_center", flipped: false });
            if (!beatTheGameSprite) beatTheGameSprite = new jaws.Sprite({ image: chopImage(guiSpriteSheet.image, 0, 256, 352, 64), x: (jaws.width / 2) | 0, y: ((jaws.height / 2) | 0) + 42, anchor: "center_center", flipped: false });
            if (!hurryUpSprite) hurryUpSprite = new jaws.Sprite({ image: chopImage(guiSpriteSheet.image, 0, 448, 176, 32), x: 0, y: 42, anchor: "top_left", flipped: false });
            if (!findEmAllSprite) findEmAllSprite = new jaws.Sprite({ image: chopImage(guiSpriteSheet.image, 176, 448, 176, 32), x: jaws.width, y: 42, anchor: "top_right", flipped: false });

            // move all gui elements around in a window size independent way (responsive liquid layout)
            if (gui_enabled) liquidLayoutGUI();

            // trigger a menu press if we click anywhere: uses the pos to determine which menu item was clicked
            window.addEventListener("mousedown", unPause, false);

            // scrolling background images
            if (use_parallax_background) {
                if (!titleparallax) {
                    titleparallax = new jaws.Parallax({ repeat_x: true, repeat_y: false });
                    titleparallax.addLayer({ image: "parallax.png", damping: 1 });
                    //titleparallax.addLayer({ image: "parallaxlayer2.png", damping: 8 });
                }
            }

        } // title screen setup function

        /**
        * update function (run every frame) for the titlescreen
        */
        this.update = function () {

            // wobble just for fun
            splashSprite.scaleTo(0.75 + (Math.sin(new Date().valueOf() * 0.001) / (Math.PI * 2)));

            if (use_parallax_background) {
                // update parallax background scroll
                titleparallax.camera_x += 4;
            }

            if (jaws.pressed("down") ||
                jaws.pressed("right") ||
				(!game_paused && !showing_credits && (jaws.mouse_y >= CREDITS_BUTTON_Y))
				) {
                log('credits button highlighted');
                titleframecount = 60; // reset particles immediately
                if (gui_enabled) menu_item_selected = 1;
            }

            if (jaws.pressed("up") ||
                jaws.pressed("left") ||
				(!game_paused && !showing_credits && (jaws.mouse_y < CREDITS_BUTTON_Y))
				) {
                log('start button highlighted');
                titleframecount = 60; // reset particles immediately
                menu_item_selected = 0;
            }

            // after gameover, debounce since you are holding down a key on prev frame
            if (noKeysPressedLastFrame) {
                if (jaws.pressed("enter") ||
					jaws.pressed("space") ||
					jaws.pressed("left_mouse_button") ||
                    (!game_paused) // title screen done: onmousedown event only
					) {

                    if (menu_item_selected == 1) {
                        showing_credits = !showing_credits;
                        game_paused = 3; // reset
                    }
                    else // user wants to start the game!
                    {
                        showing_credits = false;
                        game_paused = false; // keyboard doesn't reset this
                        sfxstart();
                        current_level_number = starting_level_number; // start from the first level
                        jaws.switchGameState(PlayState); // Start game!
                    }

                }
            }

            // ensure that we don't react to a press/key/click more than once
            if (!(jaws.pressed("enter")) && !(jaws.pressed("space")) && !(jaws.pressed("left_mouse_button")) && (game_paused == 3)) {
                // this "debounces" keypresses so you don't
                // trigger every single frame when holding down a key
                noKeysPressedLastFrame = true;
            }
            else {
                noKeysPressedLastFrame = false;
            }

            if (particles_enabled) updateParticles();

            // show which item we have currently selected
            if (titleframecount % 60 == 0) {
                startParticleSystem(jaws.width / 2 - (42 + (menu_item_selected * 32)), jaws.height / 2 + 24 + (menu_item_selected * 32));
            }
            if (titleframecount % 60 == 30) {
                startParticleSystem(jaws.width / 2 + (42 + (menu_item_selected * 32)), jaws.height / 2 + 24 + (menu_item_selected * 32));
            }

            titleframecount++;

        } // title screen update function

        /**
        * render function for the titlescreen
        */
        this.draw = function () {

            // no need to clear: parallax fills bg
            //jaws.context.fillStyle = titlescreen_background_colour;
            //jaws.context.fillRect(0, 0, jaws.width, jaws.height);

            if (use_parallax_background) {
                titleparallax.draw();
            }

            if (showing_credits) {
                // just in case a previous level transition set the scale
                msgboxSprite.scaleTo(1);
                msgboxSprite.draw();
                creditsSprite.draw();
            }
            else {
                splashSprite.draw();
                if (particles_enabled) particles.draw();
                menuSprite.draw();
            }

        } // title screen draw function

    } // title screen state

    ////////////////////////////////////////////////////////////////
    // GAME STATE: LEVEL TRANSITIONS
    ////////////////////////////////////////////////////////////////
    /**
    * A jaws state object for the display in between levels (and game over) screen.
    * Used to display messages like "game over" or "congratulations"
    */
    function LevelTransitionScreenState() {

        this.setup = function () {

            log('Game State: transition after level ' + current_level_number);

            touchControlsVisible(false);

            // clear the stopwatch timer if any
            if (game_timer) window.clearInterval(game_timer);

            transitionEndtime = new Date().valueOf() + TRANSITION_LENGTH_MS; // five seconds

            game_paused = true; // no clock updates

            if (transition_mode == TRANSITION_GAME_OVER) {
                sfxdefeat();
            }

            if (transition_mode == TRANSITION_LEVEL_COMPLETE) {
                current_level_number++; // upcoming level
                sfxvictory()
            }

        } // transition screen setup function

        // transition screen
        this.update = function () {

            // wobble just for fun
            msgboxSprite.scaleTo(0.75 + (Math.sin(new Date().valueOf() * 0.001) / (Math.PI * 2)));

            if (particles_enabled) updateParticles();

            // fireworks!
            if (Math.random() > 0.92) {
                startParticleSystem(jaws.width / 4 + Math.random() * jaws.width / 2, jaws.height / 2 - 200 + (Math.random() * 400));
            }

            if (use_parallax_background) {
                // update parallax background scroll
                titleparallax.camera_x += 4;
            }

            if (transitionEndtime < (new Date().valueOf())) {

                log('transition time is up');

                game_paused = false; // keyboard doesn't reset this

                if (transition_mode == TRANSITION_GAME_OVER) {
                    log('transitioning from game over to titlescreen');
                    gameOver(false);
                }
                else {
                    if (level[current_level_number]) {
                        log('about to play level ' + current_level_number);
                        sfxstart();
                        jaws.switchGameState(PlayState); // begin the next level
                    }
                    else {
                        log('no more level data: the player BEAT the game!');
                        gameOver(true);
                    }
                }
            }

        } // transition screen update function

        this.draw = function () {

            if (use_parallax_background) titleparallax.draw();
            msgboxSprite.draw();
            if (transition_mode == TRANSITION_GAME_OVER) {
                gameoverSprite.draw();
                outOfTimeSprite.draw();
            }
            else {
                if (level[current_level_number]) // more to come?
                {
                    //log('Next world (level ' + current_level_number + ') exists...');
                    levelcompleteSprite.draw();
                }
                else // game over: final level completed!
                {
                    //log('Next world (level ' + current_level_number + ') does not exist. GAME COMPLETED!');
                    gameoverSprite.draw();
                    beatTheGameSprite.draw();
                }
            }
            if (particles_enabled) particles.draw();

        } // transition screen draw function

    } // level transition state

    ////////////////////////////////////////////////////////////////
    // GAME STATE: PLAYING
    ////////////////////////////////////////////////////////////////
    /**
    * The in-game (during play) jaws state object.
    * This is the workhorse that handles all gameplay.
    */
    function PlayState() { // in-game state 

        /**
        * inits for the PlayState class: called once
        */
        this.setup = function () {

            profile_start("playstate setup");

            touchControlsVisible(true);

            // reset the touch flags just in case
            touchleft = touchright = touchattack = touchpause = touchjump = false;

            game_over = false;

            // init the sprite sheet tiles
            if (!sprite_sheet) sprite_sheet = new jaws.SpriteSheet({ image: "tiles.png", frame_size: [TILESIZE, TILESIZE], orientation: 'right' });

            initLevel(level[current_level_number]);
            if (gui_enabled) updateGUIsprites(TimeGUI, time_remaining); // change from 000 imediately

            // scrolling background images
            if (use_parallax_background) {
                if (!parallax) {
                    parallax = new jaws.Parallax({ repeat_x: true, repeat_y: false });
                    parallax.addLayer({ image: "parallax.png", damping: 4 });
                    //parallax.addLayer({ image: "parallaxlayer2.png", damping: 4 });
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
                //player.jump_anim = player.animation.slice(2, 3);
                player.jump_anim = player.animation.slice(14, 15);
                player.fall_anim = player.animation.slice(15, 16);
                player.attack_anim = player.animation.slice(9, 14);
                player.setImage(player.animation.frames[9]);
                //NOP: player.top_offset++; // nudge one pixel down to account for physics "nudge"

                // the collision bounding box is smaller than the DRAWING rect
                // player.rect() is used for rendering but this is used for physics
                player.collisionrect = function () {
                    if (!this.cached_collisionrect) {
                        this.cached_collisionrect = new jaws.Rect(this.x, this.top, 32, 64);
                    }
                    this.cached_collisionrect.moveTo(this.x - this.left_offset + 48, this.y - this.top_offset + 32); // bottom has no effect
                    return this.cached_collisionrect;
                };
                player.headheight = player.collisionrect().height; // remember the height of the aabb: this speeds up physics

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

            // reset the player score if this is the first level
            if (current_level_number == starting_level_number)
                player.score = 0;

            // reset some other player stats that may be leftovers from the previous level
            player.attacking = false;
            player.invulerableUntil = 0;
            player.vx = player.vy = 0; // current movement velocity
            player.inventory_keys = 0; // any items we are holding
            player.health = health_starting_value; // how many hit points we have
            player.moveTo(startx, starty); // player might be elsewhere from a previous game

            updateGUIsprites(ScoreGUI, player.score); // immediate update to proper value in case it changed prev level

            // the respawn particle system!
            if (particles_enabled) startParticleSystem(startx, starty, 5);

            // set up the chase camera view
            viewport = new jaws.Viewport({ max_x: viewport_max_x, max_y: viewport_max_y });
            jaws.activeviewport = viewport; // resize events need this in global scope

            // start the timer! (fires once a second until game_over == true)
            stopwatchstart = 0;
            // clear any previous timers just in case
            if (game_timer) window.clearInterval(game_timer);
            game_timer = window.setInterval(stopwatchfunc, 1000);

            profile_end("playstate setup");

            log('PlayState.setup() completed.');

        }; // end setup function

        /**
        * game simulation loop step - called every frame during play
        */
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

            // Update the game simulation:
            // We calculate how much time in ms has elapsed since last frame
            // and run the physics/etc step functions 1 or more times.
            // Why? Since each step is a fixed step for 60fps
            // this ensures the game runs at the same speed
            // no matter what the performance and avoids 
            // delta-based (time*speed) simulation steps that can 
            // "poke through" walls if the fps is low
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

                framecount++;

                // animate the enemies
                if (enemies) {
                    enemies.forEach(enemyAI);
                }

                if (player.jumping) {
                    if (player.vy < 0)
                        player.setImage(player.jump_anim.next());
                    else
                        player.setImage(player.fall_anim.next());
                }
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

                // reset the player's horizontal velocity
                player.vx = 0;

                // if this game has attacks in it, we trigger one (otherwise these keys are alternate jump keys)
                if (player_can_attack && !player.attacking && (touchattack || jaws.pressed("z") || jaws.pressed("x") || jaws.pressed("s") || jaws.pressed("space") || jaws.pressed("down"))) {
                    sfxattack();
                    player.attacking = true;
                }

                if (touchleft || jaws.pressed("left") || jaws.pressed("a")) { player.vx = -move_speed; player.flipped = 1; }
                else if (touchright || jaws.pressed("right") || jaws.pressed("d")) { player.vx = +move_speed; player.flipped = 0; }

                if (!player.attacking && (touchjump || jaws.pressed("up") || jaws.pressed("w") || jaws.pressed("space"))) { if (!player.jumping && player.can_jump) { sfxjump(); player.vy = jump_strength; player.jumping = true; player.can_jump = false; } }
                else { player.can_jump = true; }


                // DEBUG - ijkl - in debug mode, these keys allow you to fly around for testing hard-to-get areas
                if (debugmode) {
                    if (jaws.pressed("j")) { player.x -= 10; }
                    if (jaws.pressed("l")) { player.x += 10; }
                    if (jaws.pressed("i")) { player.y -= 14; }
                    if (jaws.pressed("k")) { player.y += 10; }
                }

                profile_start('player physics');
                applyPhysics(player); // gravity
                movePhysics(player); // collisions
                profile_end('player physics');

                // did we fall past the bottom of the world?
                if (player.y > fell_too_far) {
                    log('We fell too far: ' + player.y);
                    die();
                    sfxdie();
                }

                // useful for other types of games (such as ones with auto-scrolling):
                // ensure player never goes beyond the edge of the screen
                // this interferes with "falling off the edge" however
                // viewport.forceInside(player, 10); 

                // keep the player in the middle of the screen
                viewport.centerAround(player);
                // so we are centered around the head, not feet
                viewport.y -= VIEWPORT_Y_OFFSET;

                if (use_parallax_background) {
                    // update parallax background scroll
                    parallax.camera_x = viewport.x;
                    //parallax.camera_y = viewport.y; // buggy? it works now... but the bg image only tiles horiz...
                }

                if (gui_enabled) updateScoreGUI(); // every frame!? optimize? OK?

                if (particles_enabled) updateParticles();

            } // end sims loop for FPS independence

            // one or more collisions above may have set this to true
            if (pendingLevelComplete) levelComplete();

            profile_end('UPDATE SIMULATION');

        }; // end update function

        /**
        * the primary game render loop - called every frame during play
        */
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
                viewport.drawTileMap(tile_map);
            }

            viewport.apply(function () {

                player.draw();

                if (enemies) enemies.drawIf(viewport.isPartlyInside);

                profile_start('particles');
                particles.drawIf(viewport.isPartlyInside);
                profile_end('particles');

                if (debugcollisionaabb) player.collisionrect().draw(); // debug
                if (debugcollisionaabb && player.attacking) player.attackcollisionrect().draw(); // debug
                if (debugcollisionaabb && last_touched_sprite) last_touched_sprite.rect().draw(); // debug

            });

            if (gui_enabled) renderGUI();

            if (need_to_draw_paused_sprite) {
                need_to_draw_paused_sprite = false;
                PausedGUI.draw();
            }

            profile_end('DRAW EVERYTHING');

        }; // PlayState.draw

    } // PlayState

    /** 
    * Records the current timestamp for a named event for benchmarking.
    * Call profile_end using the same event name to store the elapsed time
    * Only used when debugging to find areas of poor performance.
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

        if (!game_paused) {
            time_remaining += time_direction;
            if (gui_enabled) updateGUIsprites(TimeGUI, time_remaining);
        }

        if ((time_remaining < 1) && gameover_when_time_runs_out) {
            log('RAN OUT OF TIME!');
            sfxdie();
            transition_mode = TRANSITION_GAME_OVER;
            jaws.switchGameState(LevelTransitionScreenState);
            // will eventually call gameOver(false);
        }
    }

    /**
    * draws the in-game HUD (head-up-display) GUI (score, etc.)
    */
    function renderGUI() {

        if (!gui_enabled) return;

        profile_start('renderGUI');

        if (TimeGUI) TimeGUI.draw();
        if (ScoreGUI) ScoreGUI.draw();
        if (CountGUI) CountGUI.draw();

        // flashing info at level start and near time out!
        if ((pickups_remaining == pickups_total) || (pickups_remaining < 6) || (time_remaining < 11)) {
            if (hurryUpSprite) {
                hurryUpSprite.scaleTo(0.8 + (Math.sin(new Date().valueOf() * 0.01) / (Math.PI * 2) * 0.2));
                hurryUpSprite.draw();
            }
            if (findEmAllSprite) {
                findEmAllSprite.scaleTo(0.8 + (Math.sin(new Date().valueOf() * 0.01) / (Math.PI * 2) * 0.2));
                findEmAllSprite.draw();
            }
        }

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

        profile_end('renderGUI');

    } // renderGUI function

    /**
    * spawns a spritesheet-based particle animation at these coordinates
    * implements a reuse POOL and only makes new objects when required
    */
    function startParticleSystem(x, y, particleType) {

        if (!particles_enabled) return;

        var p, pnum, pcount;
        if (!particleType) particleType = Math.floor(Math.random() * 1.99999); // random cycle between the first two
        for (pnum = 0, pcount = particles.length; pnum < pcount; pnum++) {
            p = particles.at(pnum);
            if (p && p.inactive) {
                break;
            }
        }

        // we need a new particle!
        if (!p || !p.inactive) {
            profile_start('new particle');
            log('All particles are in use. Allocating particle #' + pcount);
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
            p.setImage(p.animation.next());
        }

    }

    /**
    * steps the particle effects simulation
    */
    function updateParticles() {
        if (!particles_enabled) return;
        // animate the particles
        particles.forEach(
		function (p) {
		    if (!p.inactive) {
		        if (p.animation.atLastFrame()) {
		            //log('particle anim ended');
		            p.x = p.y = -999; // throw offscreen
		            p.inactive = true;
		        }
		        else {
		            p.setImage(p.animation.next());
		        }
		    }
		}
		);
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

    /**
    * During play, this will pause/unpause the game.
    * Called by either a resize event (snapped view, etc.)
    * or the player (touch pause button, press [P]
    */
    function pauseGame(forced) {
        if (forced) {
            // we might be in the main menu (game_paused==3)
            if (game_paused != 3) game_paused = true;
        }
        else // just toggle back and forth
            game_paused = !game_paused;
        log('pause toggle: ' + game_paused);
        // when we start up again, we don't want 
        // the time elapsed to be simulated suddenly
        need_to_draw_paused_sprite = true;
        lastframetime = new Date().valueOf();
        unsimulatedms = 0;
        currentframems = 0;

        if (game_paused) {
            Howler.mute(); // music/sound
            // only show the unpause touch button, not all the others
            // because they overlap if window is too small
            touchControlsVisible(false);
            if (pbutt) pbutt.style.display = 'block';
        }
        else {
            Howler.unmute(); // music/sound
            touchControlsVisible(true);
        }

    }

    /** 
    * only used during the title screen menu 
    */
    function unPause(e) {
        log('Unpausing the titlescreen = start the game!');
        if (game_paused == 3) game_paused = false;
        // unmute the music?
        //Howler.unmute();
    }

    /**
    * Very simplistic enemy AI update function: if visible, animate and check collisions
    * This could be vastly upgraded: a-star pathfinding, seeking the player and more
    * called every frame to move visible enemies
    */
    function enemyAI(nme) {
                        
        // only animate if it is visible
        if (viewport.isPartlyInside(nme)) { 
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
        } // visible
    }

    /**
    * The player has died. Wait a moment and then respawn.
    */
    function die() {
        player.dead = true;

        jaws.game_loop.pause();

        setTimeout(function () {
            
            // move to respawn point
            player.x = saved_position[0];
            player.y = saved_position[1];
            
            jaws.game_loop.unpause();
            player.dead = false;

            // reset health too
            player.health = health_starting_value;

        }, 1000);
    }

    /**
    * Simply apply gravity to the sprite's velocity,
    * so that we fall down when in the air.
    * this is a good place or more advanced functionality
    * such as friction, restitution, handling "jetpacks" and more...
    */
    function applyPhysics(obj) {
        if (obj.vy < max_velocity_y) { obj.vy += gravity; }
    }

    /**
    * Collision detection physics calculations used by the Player sprite
    * determine which map tiles are being touched and react occirdingly.
    */
    function movePhysics(obj) 
    {
        if (!tile_map) {
            return; // level doesn't exist yet!
        }

        var touchedtiles;
        var touched;

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
            // we might be touching more than one thing (eg a flower AND the ground)
            tcount = touchedtiles.length;
            for (tnum = 0; tnum < tcount; tnum++) {

                touched = touchedtiles[tnum];
                if (touched) {
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

                            obj.y = (touched.y + touched.height + obj.headheight) + 0;

                        }
                        else // falling down? or touching the floor: 
                        {
                            // note: happens CONSTANTLY when walking
                            obj.y = (touched.y - 1) | 0;

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


    /**
    * Inits the sound engine by preloading the appropriate sound data
    * ogg and wav versions are only used for online webpage versions
    * in order to account for varying codec availability between browsers
    * in win8 store apps, only the mp3 is loaded
    */
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
        soundJump = new Howl({ urls: ['game-media/jump.mp3', 'game-media/jump.ogg', 'game-media/jump.wav'], volume: 0.2 });
        soundDie = new Howl({ urls: ['game-media/die.mp3', 'game-media/die.ogg', 'game-media/die.wav'], volume: 1.0 });
        soundPickup = new Howl({ urls: ['game-media/pickup.mp3', 'game-media/pickup.ogg', 'game-media/pickup.wav'], volume: 1.0 });
        soundBounce = new Howl({ urls: ['game-media/bounce.mp3', 'game-media/bounce.ogg', 'game-media/bounce.wav'], volume: 1.0 });
        soundAttack = new Howl({ urls: ['game-media/attack.mp3', 'game-media/attack.ogg', 'game-media/attack.wav'], volume: 1.0 });
        soundHitEnemy = new Howl({ urls: ['game-media/hitenemy.mp3', 'game-media/hitenemy.ogg', 'game-media/hitenemy.wav'], volume: 1.0 });
        soundVictory = new Howl({ urls: ['game-media/success.mp3', 'game-media/success.ogg', 'game-media/success.wav'], volume: 1.0 });
        soundDefeat = new Howl({ urls: ['game-media/failure.mp3', 'game-media/failure.ogg', 'game-media/failure.wav'], volume: 1.0 });
        profile_end('soundInit');
    }


    /**
    * Empty map tile .action callback used to ensure that
    * the collision detection routines do not block the player from
    * travelling through tiles that should be ignored.
    */
    var noCollideActionFunction = function (whodunnit) {
    };

    /**
    * Collision callback event fired whenever the player touches a map tile
    * that is "bouncy" - launches the player into the air
    */
    var bouncyActionFunction = function (whodunnit) {
        log('boing!');
        sfxbounce();
        startParticleSystem(player.x, player.y - 32, 3); // take off 
        player.vy = bounce_power; // in case we "fall' into it, don't do +=
        player.jumping = true;
    };

    /**
    * Triggered when the level has been successfully cleared.
    * Switches to the transition state before loading the next level.
    */
    function levelComplete() {
        log('Level ' + current_level_number + ' complete!');
        updateGUIsprites(ScoreGUI, player.score); // immediate update to proper value 
        transition_mode = TRANSITION_LEVEL_COMPLETE;
        pendingLevelComplete = false;
        jaws.switchGameState(LevelTransitionScreenState);
    }

    /**
    * Ends the game and returns to the title screen
    */
    function gameOver(beatTheGame) {
        log('gameOver!');

        if (beatTheGame)
            log('VICTORY!');

        // clear any previous timers just in case
        if (game_timer) window.clearInterval(game_timer);

        game_over = true;

        jaws.switchGameState(TitleScreenState);
    }

    /** 
    * Changes the sprites used by a SpriteList (score, time, counter, etc) eg. 00000-99999
    * updateGUIsprites cannot handle negative numbers: only 0..9 in the spritesheet
    */
    function updateGUIsprites(gui, num) {
        if (!gui_enabled) return;
        // individual digits
        //log('updateGUIsprites: using ' + gui.length + ' digit sprites to display: ' + num);
        var digitcount = 0;
        var digit = 0;
        var digitsprite = null;
        while (digitsprite = gui.at(digitcount + 1)) { // +1 because the "label" is the first sprite
            digit = Math.floor(num % 10);
            if (digit < 0) digit = 0; // eg if num is -1
            num = Math.floor(num / 10);
            digitsprite.setImage(fontSpriteSheet.frames[digit]);
            digitcount++;
        }
    }

    /**
    * Changes the sprites used by the ScoreGUI, 
    * counting by 1 each call until we reach player.score
    */
    function updateScoreGUI() {
        if (displayedScore == player.score) return;

        // don't fall too far behind
        if (Math.abs(player.score - displayedScore) > 200)
            displayedScore = player.score;
        else
            displayedScore++;

        updateGUIsprites(ScoreGUI, displayedScore);
    }

    /**
    * Callback function run whenever the player collides
    * with a "pickup" item in the world map. The player
    * gains some points and the item is removed from the world.
    */
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
                //levelComplete(); // might get called more than once if we run it here
                pendingLevelComplete = true; // handle edge case: we hit >1 in the same frame
            }

        }
    };

    /**
    * Callback function run whenever an enemy 
    * is attacked and destroyed by the player
    */
    var enemyDestroyFunction = function (whodunnit) {
        log('ENEMY DESTROY ACTION at ' + this.x + ',' + this.y, true);
        if (whodunnit) {
            player.score += enemy_destroy_points;
            sfxhitenemy();
            startParticleSystem(this.x, this.y)
            enemies.remove(this); // take out of sprite list
        }
    }

    /**
    * Callback function run whenever the player collides
    * with a level tile that was in the "level warp" layer
    * the level is considered complete and the next map 
    * will be loaded after a transition state completed
    * note: this can fire multiple times in a single frame
    * so be sure to ignore consecutive events
    */
    var warpActionFunction = function (whodunnit) {
        log('WARP ACTION at ' + this.x + ',' + this.y, true);
        //levelComplete(); // might get called more than once if we run it here
        pendingLevelComplete = true; // handle edge case: we hit >1 in the same frame
    };

    /**
    * Callback function run whenever the player collides with
    * a level tile that was in the "dangerous" layer
    * player is damaged and dies unless it has more health
    */
    var dangerActionFunction = function (whodunnit) {
        log('DANGEROUS ACTION at ' + this.x + ',' + this.y, true);

        // not used in this example game but handy for games with >1 hit point
        if (player.invulerableUntil > currentFrameTimestamp) {
            log('Currently invulnerable - damage ignored.');
        }
        if (whodunnit) {
            player.health--;
            sfxdie();

            // debounce damage (in case we touch many things in short succession)
            player.invulerableUntil = currentFrameTimestamp + damageInvulMS;

            // in this example game we always start with only 1hp 
            if (player.health < 1) {
                die(true);
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
        log('Map time_limit: ' + leveldata.properties.time_limit);
        log('Map player_can_attack: ' + leveldata.properties.player_can_attack);
        

        // level blocks - foreground
        spawnLevel(leveldata.layers[0].data, leveldata.width, leveldata.height);

        // pickups
        if (leveldata.layers[1]) {
            pickups_total = pickups_remaining = spawnLevel(leveldata.layers[1].data, leveldata.width, leveldata.height, pickupActionFunction);
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

		// enemies - these are not put into the tile_map
        if (leveldata.layers[5])
            spawnEnemies(leveldata.layers[5].data, leveldata.width, leveldata.height, dangerActionFunction);

		// warp
        if (leveldata.layers[6])
            spawnLevel(leveldata.layers[6].data, leveldata.width, leveldata.height, warpActionFunction);

        if (leveldata.properties.time_limit) {
            // if there is a time limit, you must race the clock to get all the pickups
            log('time_limit is set in the level data: race the clock mode!');
            time_remaining = Number(leveldata.properties.time_limit);
            time_direction = -1; // start counting down!
            gameover_when_time_runs_out = true;
            level_complete_when_all_pickups_gone = true;
        }
        else {
            // if no time limit, only way to exit a level is hit a WARP TILE
            log('No time_limit set in the level data: exploration mode!');
            time_remaining = 0;
            time_direction = 1; // count up
            gameover_when_time_runs_out = false;
            level_complete_when_all_pickups_gone = false;
        }

        if (leveldata.properties.player_can_attack)
            player_can_attack = Boolean(leveldata.properties.player_can_attack);

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
        viewport_max_y = (leveldata.height + 2) * leveldata.tileheight; // extend past the level data: fell_too_far + 1;

        log('initLevel complete.');

        log('Total tiles in the world: ' + world_complexity)
        log('Total number of pickups: ' + pickups_remaining)

        profile_end('initLevel');
    }

    /** 
    * fills the "enemies" SpriteList with evil entities based on map data
    */
    function spawnEnemies(data, width, height) {
        log('spawnEnemies...');
        log('parsing [' + data.name + '] ' + data.length + ' array items: ' + width + 'x' + height);

        num_enemies = 0;

        log('creating enemies sprite list');
        // overwrite any previous sprite list (from the last level)
        enemies = new jaws.SpriteList();
        
        for (var i = 0; i < width; i++) {
            for (var i2 = 0; i2 < height; i2++) {

                // not used in this example but handy for a game with more than one enemy style
                var nextspritenum = data[i + (i2 * width)] - 1;

                // ignore empty tiles
                if (nextspritenum > -1) {

                    num_enemies++;

                    var anenemy = new jaws.Sprite({ x: i * TILESIZE, y: i2 * TILESIZE, anchor: "center_center", flipped: true });
                    anenemy.animation = new jaws.Animation({ sprite_sheet: jaws.assets.get("enemies.png"), frame_size: enemy_framesize, frame_duration: 150, bounce: true });
                    anenemy.move_anim = anenemy.animation.slice(0, 7);
                    anenemy.setImage(anenemy.animation.frames[0]);
                    anenemy.action = dangerActionFunction;
                    anenemy.hitaction = enemyDestroyFunction;
                    anenemy.enemytype = nextspritenum; // see above
                    enemies.push(anenemy);

                }
            }
        }

        log('done spawnLevel: ' + num_enemies + ' enemies created.');
        return num_enemies;
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

        log('done spawnLevel: ' + tilesadded + ' sprites created.');
        return tilesadded;
    }

    /**
    * Debug console output.
    * Used only when debugmode > 0.
    */
    function log(str) {
        if (!debugmode) return;
        console.log(str);
    }

    /**
    * Speed optimized version of function from line 2459 in jaws.js
    * the main limitation imposed is only ONE tile per tile location (jaws version allows array)
    * Returns occupants of all cells touched by 'rect' 
    */
    jaws.TileMap.prototype.atRect = function (rect) {
        var objects = []
        var items

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
                    if (this.cells[col][row][0]) objects.push(this.cells[col][row][0]);
                }
            }
        //}
        //catch (e) {
            // ... problems
        //}
    return objects;
    }

    /**
    * A speed-optimized version of the jaws TileMap render code
    * the main difference is less error checking and array manipulation
    * plus only ONE tile per coordinate is returned
    * comment out this function if you need overlapping tiles
    */
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
    function touchButtonPause(e) {
        log('touchButtonUp');
        touchpause = true;
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
    function untouchButtonPause(e) {
        log('untouchButtonUp');
        touchpause = false;
    }

    /**
    * Detects the availability of touch input (on tablets, etc)
    * and starts listening for pointer events as required
    */
    function initMSTouchEvents() {

        lbutt = document.getElementById('buttonleft');
        dbutt = document.getElementById('buttondown');
        rbutt = document.getElementById('buttonright');
        ubutt = document.getElementById('buttonup');
        pbutt = document.getElementById('buttonpause');

        if (window.navigator.msPointerEnabled) {
            log('MS pointer events are enabled.');

            if (window.navigator.msMaxTouchPoints) { log('MS touches (x' + window.navigator.msMaxTouchPoints + ' points max) are available.'); }

            if (lbutt) lbutt.addEventListener("MSPointerDown", touchButtonLeft, false);
            if (rbutt) rbutt.addEventListener("MSPointerDown", touchButtonRight, false);
            if (dbutt) dbutt.addEventListener("MSPointerDown", touchButtonDown, false);
            if (ubutt) ubutt.addEventListener("MSPointerDown", touchButtonUp, false);
            if (pbutt) pbutt.addEventListener("MSPointerDown", touchButtonPause, false);

            // MSPointerUp works great for mice and touches that don't leave the screen
            if (lbutt) lbutt.addEventListener("MSPointerUp", untouchButtonLeft, false);
            if (rbutt) rbutt.addEventListener("MSPointerUp", untouchButtonRight, false);
            if (dbutt) dbutt.addEventListener("MSPointerUp", untouchButtonDown, false);
            if (ubutt) ubutt.addEventListener("MSPointerUp", untouchButtonUp, false);
            if (pbutt) pbutt.addEventListener("MSPointerUp", untouchButtonPause, false);

            // MSPointerOut is useful to avoid MSPointerUp not firing if you drag a finger offscreen
            if (lbutt) lbutt.addEventListener("MSPointerOut", untouchButtonLeft, false);
            if (rbutt) rbutt.addEventListener("MSPointerOut", untouchButtonRight, false);
            if (dbutt) dbutt.addEventListener("MSPointerOut", untouchButtonDown, false);
            if (ubutt) ubutt.addEventListener("MSPointerOut", untouchButtonUp, false);
            if (pbutt) pbutt.addEventListener("MSPointerOut", untouchButtonPause, false);
        }
        else {
            // standard touch events for browser/ios/non IE
            if (lbutt) lbutt.addEventListener("touchstart", touchButtonLeft, false);
            if (rbutt) rbutt.addEventListener("touchstart", touchButtonRight, false);
            if (dbutt) dbutt.addEventListener("touchstart", touchButtonDown, false);
            if (ubutt) ubutt.addEventListener("touchstart", touchButtonUp, false);
            if (pbutt) pbutt.addEventListener("touchstart", touchButtonPause, false);

            if (lbutt) lbutt.addEventListener("touchend", untouchButtonLeft, false);
            if (rbutt) rbutt.addEventListener("touchend", untouchButtonRight, false);
            if (dbutt) dbutt.addEventListener("touchend", untouchButtonDown, false);
            if (ubutt) ubutt.addEventListener("touchend", untouchButtonUp, false);
            if (pbutt) pbutt.addEventListener("touchend", untouchButtonPause, false);

            // alow mouse events for debugging
            if (lbutt) lbutt.addEventListener("mousedown", touchButtonLeft, false);
            if (rbutt) rbutt.addEventListener("mousedown", touchButtonRight, false);
            if (dbutt) dbutt.addEventListener("mousedown", touchButtonDown, false);
            if (ubutt) ubutt.addEventListener("mousedown", touchButtonUp, false);
            if (pbutt) pbutt.addEventListener("mousedown", touchButtonPause, false);

            if (lbutt) lbutt.addEventListener("mouseup", untouchButtonLeft, false);
            if (rbutt) rbutt.addEventListener("mouseup", untouchButtonRight, false);
            if (dbutt) dbutt.addEventListener("mouseup", untouchButtonDown, false);
            if (ubutt) ubutt.addEventListener("mouseup", untouchButtonUp, false);
            if (pbutt) pbutt.addEventListener("mouseup", untouchButtonPause, false);
        }

        // dont't let any mouse/touch select things: this is a game
        document.addEventListener("selectstart", function (e) { e.preventDefault(); }, false);
        // dont't let touch-and-hold (or right click) create a context menu
        document.addEventListener("contextmenu", function (e) { e.preventDefault(); }, false);
        // don't show the hint visual for context menu either
        document.addEventListener("MSHoldVisual", function (e) { e.preventDefault(); }, false);

        log('initMSTouchEvents completed.');
    }

    /**
    * sets the visibility of the on-screen touch controls
    */
    function touchControlsVisible(turnon) {
        var displayState = 'none';
        if (turnon) displayState = 'block';
        // make the touch controls visible
        if (lbutt) lbutt.style.display = displayState;
        if (rbutt) rbutt.style.display = displayState;
        if (dbutt) dbutt.style.display = displayState;
        if (ubutt) ubutt.style.display = displayState;
        if (pbutt) pbutt.style.display = displayState;
    }

    /**
    * moves all GUI sprites around depending on window size
    * this function allows Ludus games to be "responsive"
    */
    function liquidLayoutGUI() {
        log('liquidLayoutGUI');

        CREDITS_BUTTON_Y = (jaws.height / 2 + 40) | 0;
        // move any msgboxes/GUIs that are centered:
        if (gameoverSprite) gameoverSprite.moveTo((jaws.width / 2) | 0, ((jaws.height / 2) | 0) - 42);
        if (outOfTimeSprite) outOfTimeSprite.moveTo((jaws.width / 2) | 0, ((jaws.height / 2) | 0) + 42);
        if (beatTheGameSprite) beatTheGameSprite.moveTo((jaws.width / 2) | 0, ((jaws.height / 2) | 0) + 42);
        if (hurryUpSprite) hurryUpSprite.moveTo(0, 42);
        if (findEmAllSprite) findEmAllSprite.moveTo(jaws.width, 42);
        if (levelcompleteSprite) levelcompleteSprite.moveTo((jaws.width / 2) | 0, (jaws.height / 2) | 0);
        if (menuSprite) menuSprite.moveTo((jaws.width / 2) | 0, (jaws.height / 2 + 40) | 0);
        if (creditsSprite) creditsSprite.moveTo((jaws.width / 2) | 0, (jaws.height / 2) | 0);
        if (splashSprite) splashSprite.moveTo((jaws.width / 2) | 0, (jaws.height / 2) | 0);
        if (msgboxSprite) msgboxSprite.moveTo((jaws.width / 2) | 0, (jaws.height / 2 + 8) | 0); // +8 since the shadow makes it not vistually centered
        if (PausedGUI) PausedGUI.moveTo((jaws.width / 2) | 0, (jaws.height / 2) | 0);
        // move the gui timer/score/count
        if (TimeGUIlabel) TimeGUIlabel.moveTo(time_gui_x, time_gui_y);
        if (ScoreGUIlabel) ScoreGUIlabel.moveTo(((jaws.width / 2) | 0) + score_gui_x, score_gui_y);
        if (CountGUIlabel) CountGUIlabel.moveTo(jaws.width + count_gui_x, count_gui_y);
        // top left
        if (TimeGUI) {
            for (var n = 0; n < time_gui_digits; n++) {
                TimeGUI.at(n + 1).moveTo(time_gui_x + time_gui_digits_offset + (time_gui_spacing * time_gui_digits) - (time_gui_spacing * n), time_gui_y);
            }
        }
        // top center
        if (ScoreGUI) {
            for (var n = 0; n < score_gui_digits; n++) {
                ScoreGUI.at(n + 1).moveTo(((jaws.width / 2) | 0) + score_gui_x + score_gui_digits_offset + (score_gui_spacing * score_gui_digits) - (score_gui_spacing * n), score_gui_y);
            }
        }
        // top right
        if (CountGUI) {
            for (var n = 0; n < count_gui_digits; n++) {
                CountGUI.at(n + 1).moveTo(jaws.width + count_gui_x + count_gui_digits_offset + (count_gui_spacing * count_gui_digits) - (count_gui_spacing * n), count_gui_y);
            }
        }
    }

    /**
    * this function is used to detect when the screen size has changed
    * due to rotation of a tablet or going into "snapped" view
    * it resizes the game canvas and pauses the game
    */
    function onResize(e) {
        log('onResize!');
        log('window size is now ' + window.innerWidth + 'x' + window.innerHeight);

        // for example, on a 1366x768 tablet, swiped to the side it is 320x768
        jaws.canvas.width = window.innerWidth;
        jaws.canvas.height = window.innerHeight;
        jaws.width = jaws.canvas.width;
        jaws.height = jaws.canvas.height;
        if (viewport) viewport.width = jaws.canvas.width;
        if (viewport) viewport.height = jaws.canvas.height;

        // move the gui elements around
        liquidLayoutGUI();

        // wait for the user to be ready to play
        pauseGame(true);

    }

    /**
    * Main Game Inits begin here - called by jaws.onload.
    * Enumerates level data and window events and requests art/sounds to be downloaded.
    * Many other inits occur only once art/sounds have been loaded:
    * see TitleScreenState.setup() and PlayState.setup()
    */
    function initLudus() {

        log('initLudus');

        // these are put here only to force them on TOP of the info listing
        profile_start('UPDATE SIMULATION');
        profile_end('UPDATE SIMULATION');
        profile_start('DRAW EVERYTHING');
        profile_end('DRAW EVERYTHING');

        // make sure the game is liquid layout resolution-independent (RESPONSIVE)
        window.addEventListener("resize", onResize, false);

        // listen for touch events if we're running on a Win8 tablet
        initMSTouchEvents();

        // also load all the sounds if required
        if (!mute) soundInit();

        // enumerate any level data included in other <script> tags
        while (window['level' + levelnext]) {
            level.push(window['level' + levelnext]);
            levelnext++;
        }
        log('Max level number: ' + (levelnext - 1));

        // optionally ensure all gfx data is current by re-downloading everything (no cache)
        if (debugmode) jaws.assets.bust_cache = true;

        // start downloading all the art using a preloader progress screen
        jaws.assets.root = "game-media/";
        jaws.assets.add(["titlescreen.png", "gui.png", "font.png", "parallax.png", "player.png", "particles.png", "tiles.png", "msgbox.png", "enemies.png"]);

        // once the art has been loaded we will create an instance of this class
        // and begin by running its setup function, then the update/draw loop
        jaws.start(TitleScreenState);
    };

    /**
    * All initializations are run once this event fires
    * which occurs after the html page has loaded.
    */
    log('Ludus engine is ready. Waiting for onload event...');
    jaws.onload = initLudus;

    // this line ends the closure and runs the code inside
})();

