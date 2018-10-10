const compress = new Compress
var i=0;
var upload = document.getElementById('upload')
var preview = document.getElementById("preview");
upload.addEventListener('change', (evt) => {

  i+=1;

 
 
  const files = [...evt.target.files];
 
  compress.compress(files, {
    size: 7, // the max size in MB, defaults to 2MB
    quality: 0.75, // the quality of the image, max is 1,
    maxWidth: 1920, // the max width of the output image, defaults to 1920px
    maxHeight: 1920, // the max height of the output image, defaults to 1920px
    resize: true // defaults to true, set false if you do not want to resize the image width and height
  }).then((images) => {
 
   
    const img = images[0];
   
    if(preview)
    preview.src = `${img.prefix}${img.data}`;
    const base64str = img.data
    const imgExt = img.ext
    var file = Compress.convertBase64ToFile(base64str, imgExt);
     var int8ArrayView;
     const dTT = new DataTransfer();
    const reader = new FileReader();
 
    reader.onload = function(e)
    {
     
     
       int8ArrayView  = new Int8Array(e.target.result);
      
   
     // Firefox < 62 workaround exploiting https://bugzilla.mozilla.org/show_bug.cgi?id=1422655
    
    
         dTT.items.add(new File([int8ArrayView], img.alt, {type:img.ext, lastModified:img.lastModifiedDate}));
          
          if(i==1)
         upload.files = dTT.files;
      
  
    
     
     
    }
    
    
  reader.readAsArrayBuffer(file);
     

   
  })
}, false)

