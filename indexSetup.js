indexSetup();
{
	$("body").load(function() {resizeContentFrame();browserOnload();
	});
	$("body").resize(resizeContentFrame());
}