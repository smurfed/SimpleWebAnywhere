$(function () {
    // detection of double output encoding
    var msg = '<\p class=topWarning><\strong>Warning:<\/strong> ';
    var url = 'ocCheck.php?' + (new Date()).getTime();
    $.get(url, function (ocStatus) {
        $.get(url + '&hello=1', function (ocHello) {
            if (ocHello != 'World!') {
                msg += 'It appears output is being automatically compressed, interfering ' 
                     + ' with Minify\'s own compression. ';
                if (ocStatus == '1')
                    msg += 'The option "zlib.output_compression" is enabled in your PHP configuration. '
                         + 'Minify set this to "0", but it had no effect. This option must be disabled ' 
                         + 'in php.ini or .htaccess.';
                else
                    msg += 'The option "zlib.output_compression" is disabled in your PHP configuration '
                         + 'so this behavior is likely due to a server option.';
                $(document.body).prepend(msg + '<\/p>');
            } else
                if (ocStatus == '1')
                    $(document.body).prepend('<\p class=topNote><\strong>Note:</\strong> The option '
                        + '"zlib.output_compression" is enabled in your PHP configuration, but has been '
                        + 'successfully disabled via ini_set(). If you experience mangled output you '
                        + 'may want to consider disabling this option in your PHP configuration.<\/p>'
                    );
        });
    });
});