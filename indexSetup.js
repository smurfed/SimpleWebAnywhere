function indexSetup()
{
	$("body").load(function() {resizeContentFrame();browserOnload();});
	//$("body").resize(resizeContentFrame());
	$("#Form2").submit(function(){javascript:nextNodeContentFinder(this);return false;});

	$("#location_go").click(function(){nextNodeContentFinder(this);return false;}); 
	$("#find_previous_button").click(function(){nextNodeContentFinder(this);return false;});
	
	$("#find_next_button").click(function(){nextNodeContentFinder(this);});
    
	$("#Language").click(function() {WA.Interface.addLanguageChanger();});
    $("#PopularWebsites").click(function(){WA.Interface.addPopularWebsites();});
}