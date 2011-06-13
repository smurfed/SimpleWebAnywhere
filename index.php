<?php
// Turn on error reporting.
if(isset($_REQUEST['debug']) && $_REQUEST['debug']==='true') {
  error_reporting(E_ALL);
  ini_set('display_errors','On');
}

// Standard WebAnywhere configuration file.
include('config.php');

// Load locale functionality
include('locale.php');

// Prepare optional argument string.
$arguments = "";
if(isset($_REQUEST['debug'])) {
  $arguments .= 'debug=' . $_REQUEST['debug'];
}
if(isset($_REQUEST['embed'])) {
  if(strlen($arguments) > 0) {
    $arguments .= '&';
  }
  $arguments .= 'embed=' . $_REQUEST['embed'];
}
if(isset($_REQUEST['script'])) {
  if(strlen($arguments) > 0) {
    $arguments .= '&';
  }
  $arguments .= 'script=' . $_REQUEST['script'];
}

if(strlen($arguments) > 0) {
  $arguments = '?' . $arguments;
}

$start_url = (isset($_REQUEST['starting_url']) ? base64_encode($_REQUEST['starting_url']) : base64_encode($default_content_url));
$start_url = str_replace('$url', $start_url, $wp_path);
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"
 "http://www.w3.org/TR/html4/strict.dtd">
<html>
<HEAD>
<TITLE>WebAnywhere - Your Access Technology Anywhere</TITLE>
<link rel="stylesheet" type="text/css" href="index.css"/>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">

<?php // Start of the WebAnywhere code. ?>


<?php
// It's about a million times easier to debug Javascript when your source files
// haven't been messed with.  Unfortunately, it's also slower and causes the
// browser to issue many more requests.
if(isset($_REQUEST['embed']) && $_REQUEST['embed']!=='true') { ?>
<?php
}

// Array of scripts used by the system.
// In the future, this may calculate dependencies and only include those
// scripts which are actually needed.
$scripts =
  array(
        'vars.js',
        'utils/md5.js',
        'utils/utils.js',
        'utils/base64.js',
        'nodes.js',
        'sound/sounds.js',
        'startup/standalone.js',
        'sound/prefetch.js',
        'input/keyboard.js',
        'input/action-queue.js',
        'interface/interface.js',
        'extensions/extensions.js',
//        'json2.js',
        'wa.js',
        'startup/start.js'
        );

// Depending on the type of sound player used, include the appropriate
// set of routines for playing sounds.
if(isset($_REQUEST['embed']) && $_REQUEST['embed']==='true') {
  array_unshift($scripts, 'sound/sound_embed.js');
} else {
  array_unshift($scripts, 'sound/soundmanager2.js');
}

// Add in any system-defined extensions.
foreach($extensions as $extension_path) {
  array_push($scripts, $extension_path);
}

// Optionally include Firebug Lite.
if(isset($_REQUEST['firebug']) && $_REQUEST['firebug']==='true') {
  echo '<script type="text/javascript" src="' . $script_path .
    '/utils/firebug-lite.js"></script>';
}

// Depending on whether we're in debug mode, either include
// each script separately (better for debugging), or
// combined script using the script minimizer.
if(isset($_REQUEST['debug']) && $_REQUEST['debug']==='true') {
  $start = '<script type="text/javascript" src="' . $script_path . '/';
  $end = '"></script>';
  
  // Output script tags individually.
  echo $start . implode($end . "\n" . $start, $scripts) . $end . "\n";
} else {
  echo '<script type="text/javascript" src="';
  echo $min_script_path . '/?b=' . trim($script_path, '/') . '&f=';

  // Concatenate the individual scripts used into one long string.
  echo implode(',', $scripts) . '"></script>';
}
?>
<?php
if(isset($_REQUEST['script']) && isset($_REQUEST['script'])) {?>
<script type="text/javascript" src="http://webinsight.cs.washington.edu/wa/repository/getscript.php?scriptnum=<?php
echo $_REQUEST['script'];
?>"></script>
<?php
}
?>
<script type="text/javascript">
WA.sessionid="<?php echo session_id(); ?>";
function browserOnload() {
}
</script>

<script type="text/javascript" src="<?php
echo $script_path;
?>/input/keymapping.php"></script>



</HEAD>

<body onload="resizeContentFrame(); browserOnload();" onresize="resizeContentFrame()">
    <div ID="wa_navigator">
      <div ID="wa_navigator_inner">

      <div id="wa_browser_interface">
	        <table width="100%">
	            <tr width="100%">
	              <form onSubmit="javascript:navigate(this);return false;" style="margin: 0; padding: 0; display: inline;" autocomplete="off">
	                <td width="60%">
	                    <label for="location" style="position: absolute; top: -100px">Location:&nbsp;</label>
	                    <input class="inputbox" type="text" id="location" autocomplete="off"/>
	                </td>
	                <td>
	                	<label for="deviceselection" style="position: absolute; top: -100px">Device:&nbsp;</label>
	                	<select id="deviceselection" class="inputselectbox">
							<option value="browser"><?php echo wa_gettext('Current Browser') ?></option>
							<option value="simplest"><?php echo wa_gettext('Simplest') ?></option>
							<option value="iphone"><?php echo wa_gettext('iPhone') ?></option>
							<option value="android"><?php echo wa_gettext('Android') ?></option>
							<option value="blackberry"><?php echo wa_gettext('BlackBerry') ?></option>
						</select>
					</td>
	                <td>
	                    <input class="inputbutton" name="go" type="submit" value="<?php echo wa_gettext('Go') ?>" id="location_go" onclick='navigate(this); return false;'/>
	                </td>
	              </form>
	              <form onSubmit="javascript:nextNodeContentFinder(this);return false;" style="margin: 0; padding: 0; display: inline;" autocomplete="off">
	                <td width="20%" id="wa_finder_field_container">
	                    <input class="inputbox" type="text" name="finder_field" id="wa_finder_field"/>
	                </td>
	                <td>
	                    <input class="inputbutton" id="find_previous_button" name="find_previous_button" type="button" value="<?php echo wa_gettext('Previous') ?>" onclick='prevNodeContentFinder(this); return false;'/>
	                </td>
	                <td>
	                    <input class="inputbutton" id="find_next_button" name="find_next_button" type="button" value="<?php echo wa_gettext('Next') ?>" onclick='nextNodeContentFinder(this); return false;'/>
	                </td>
	              </form>
	            </tr>
	        </table>
        </div>

        <!-- div id="wa_text_display_container" style="width: 5000px;" -->
        <div id="wa_text_display_container">
          <span id="wa_text_display"><?php echo wa_gettext("Welcome to WebAnywhere") ?></span>
        </div>

		<div style="display: none;">
            <div <?php if(isset($_REQUEST['debug']) && $_REQUEST['debug']==='true') { echo 'style="visibility: display;"'; } else { echo 'style="visibility: hidden"'; } ?>>
              <p>Playing: <span id="playing_div"></span> Features: <span id="sound_div"></span></p>
            </div>
            <div <?php if(isset($_REQUEST['debug']) && $_REQUEST['debug']==='true') { echo 'style="visibility: display;"'; } else { echo 'style="visibility: hidden"'; } ?>>
                <span id="test_div"></span>
            </div>
            <div <?php if(isset($_REQUEST['debug']) && $_REQUEST['debug']==='true') { echo 'style="visibility: display;"'; } else { echo 'style="visibility: hidden"'; } ?>>
              <p><span id="debug_div"></span></p>
            </div>
            <?php if(isset($_REQUEST['debug']) && $_REQUEST['debug']==='true') { ?>
            <p>
                <form name="recorder_form" method="post" action="recorder.php"><br/>
                    <input name="submit" type="submit" value="submit">
                    <textarea id="recording" name="recording" rows="30" cols="150"></textarea>
                </form>
            </p>
            <?php } ?>
		</div>

       </div>
    </div>
    <DIV ID="wa_iframe_div">
        <IFRAME id="content_frame" NAME="content_frame" WIDTH="100%" HEIGHT="100%" FRAMEBORDER="0" SRC="<?php echo $start_url; ?>" onload="newPage('onload' + this.contentWindow)">
            <p><a href="<?php echo $start_url; ?>">example</a></p>
        </IFRAME>
    </DIV>
    <DIV ID="wa_blocker_div"></DIV>
    <DIV ID="wa_blocker_content_div"></DIV>
    <?php if($webtrax){ ?>
      <script src="scripts/extensions/flash/swfobject.js" type="text/javascript"></script>
   
    <?php } ?>
    <script type="text/javascript" src="/index.js"></script>
    <script type="text/javascript" src="<?php
echo $script_path;
?>/js-config.php"></script>

</body>
</html>
