Ludus Game Starter Kit
======================

LUDUS HTML5 Platformer Game Starter Kit for Windows8 Store
by Christer (McFunkypants) Kaitila http://mcfunkypants.com

Source: 
https://github.com/mcfunkypants/ludus

Demos:
http://www.mcfunkypants.com/ludus

Welcome to Ludus, brave adventurer! 

Ludus is a dirt-simple game engine that uses html5 canvas.
It was designed specifically for mario/sonic style platformer
games but could be used for any genre with minimal changes.
It boasts great performance, and requires only free tools. 

The word Ludus means PLAY/GAME/TRAINING in latin. The Ludus engine
is designed to be a great way to learn to make games.

Sure, there are bigger and more complex game engines.

This one is designed to be easy to play around with.

Why? It was created to run real-world games that have a beginning,
middle, and end. It was optimized to run on less powerful systems
and touch-screen tablets. It is simple, but goes beyond the
level of a "tech demo" to encapsulate all the required functionality
you might need to make a polished game, such as GUI and sound.

PLAYING THE EXAMPLE GAMES

There are two example games:
Rubba Rabbit, a bouncy, fast, bright platformer, and
Gwendolynn the Lionhearted, a dark, dangerous metroidvania.

YouTube Video of the games:
http://www.youtube.com/watch?v=1DftXvXFTl8

Both games are available for play online in any browser
as well as a download on the Windows 8 store.

Play them here:
http://mcfunkypants.com/RubbaRabbit/
http://mcfunkypants.com/Gwendolynn/

You can also run the index.html files on a localhost
webserver (they have to be run using a web server due to 
browser security sandboxing).

Finally, if you wish you can install the store apps by
right-clicking the .ps1 files inside a subfolder of
"apppackages" (if you are using an administrator account).

IT'S POSSIBLE TO MAKE A GAME USING LUDUS IN A WEEKEND.

You could make your own game just by changing the artwork:
it is possible to make a new game without ever touching a line 
of code. All you would need to do is modify the .png and .mp3
art assets as well as the level#.js level data files.

The best tool to create in-game worlds is TILED
(http://www.mapeditor.org) which exports data in .json format.

Check out the example .tmx source files and see if you can
make your own game! Once you've made a level, export as .json
and then run the _buildlevels.bat file to convert JSON
to JSONP data to a new level#.js file.

The one important thing to remember is that each layer is
important. The order matters. The bottom-most layer is for 
regular world tiles that the player will collide with. The
rest are for pickups, bouncy platforms, dangerous spikes,
and so on. 

Additionally, you should modify the game settings in the
MAP MENU -> MAP PROPERTIES dialog. Gravity, speed and
the player's starting position are all stored there.

HACKING THE SOURCE CODE

The only source code file you will want to modify,
if you choose to start coding, is ludus.js. Inside,
you'll notice all sorts of variables at the top which you
can modify to your heart's content. Note that some
of these variables are overwritten by whatever is defined 
inside the level data.

With regard to the structure of the code, the most important
thing to know is that the game is controlled by STATE objects.

Each state (title screen, in-game, and between level transitions)
is a class object that has a .setup(), .update() and .draw()
function. You could add new states for things like boss battles,
inventory screens or a high score table.

See these class constructors:
function TitleScreenState()
function LevelTransitionScreenState()
function PlayState()

HAVE FUN!

Christer Kaitila
@McFunkypants on twitter
http://www.mcfunkypants.com