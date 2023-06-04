let zip = new JSZip();
let comparedImages = [];
const statusText = document.getElementById("status-text");
const downloadLink = document.getElementById("download-link");
const comparisonAgain = document.getElementById("comparison-again");
const stopButton = document.getElementById("stop-button");
const imageInput = document.getElementById("image-input");
const thresholdInput = document.getElementById("threshold-input");
const spinner = document.getElementById("spinner");
const imageContainer = document.getElementById("image-container");
let shouldContinueComparison = true;

const compareImages = () => {
  if (!shouldContinueComparison) {
    console.log("Comparison stopped");
    return;
  }

  comparisonAgain.style.display = "none";
  statusText.innerText = "";

  const files = imageInput.files;
  const threshold = parseInt(thresholdInput.value);

  if (files.length < 2) {
    alert("Please select at least two images");
    return;
  }

  imageContainer.innerHTML = "";
  spinner.classList.remove("hidden");
  statusText.textContent = "Comparing images...";
  downloadLink.style.display = "none";
  comparisonAgain.style.display = "none";

  Array.from(files).forEach((file, index) => {
    const liElement = document.createElement("li");
    liElement.classList.add("relative");

    const divElement = document.createElement("div");
    divElement.classList.add(
      "group",
      "aspect-w-1",
      "aspect-h-1",
      "overflow-hidden",
      "bg-gray-200",
      "rounded-lg",
      "focus-within:ring-2",
      "focus-within:ring-offset-2",
      "focus-within:ring-indigo-500",
      "focus-within:ring-offset-gray-100"
    );
    liElement.appendChild(divElement);

    const imgElement = document.createElement("img");
    imgElement.id = "image-" + index;
    imgElement.classList.add(
      "object-cover",
      "group-hover:opacity-75",
      "skeleton",
      "animate-pulse"
    );
    imgElement.alt = "";
    divElement.appendChild(imgElement);

    const buttonElement = document.createElement("button");
    buttonElement.type = "button";
    buttonElement.classList.add("absolute", "inset-0", "focus:outline-none");
    buttonElement.innerHTML =
      '<span class="sr-only">View details for ' + file.name + "</span>";
    divElement.appendChild(buttonElement);

    const captionElement = document.createElement("p");
    captionElement.id = "caption-" + index;
    captionElement.classList.add(
      "mt-2",
      "text-sm",
      "text-gray-400",
      "truncate",
      "font-medium"
    );
    liElement.appendChild(captionElement);

    const sizeElement = document.createElement("p");
    sizeElement.classList.add("text-sm", "text-gray-200", "truncate");
    sizeElement.textContent = (file.size / 1024 / 1024).toFixed(2) + " MB";
    liElement.appendChild(sizeElement);

    imageContainer.appendChild(liElement);

    const reader = new FileReader();

    reader.onload = async function (event) {
      imgElement.src = event.target.result;

      imgElement.onload = async function () {
        const suitabilityReason = await getImageSuitabilityReason(imgElement);
        imgElement.classList.remove("animate-pulse", "skeleton");
        captionElement.textContent =
          suitabilityReason === "Suitable for training"
            ? "Suitable"
            : "Not suitable" + " " + suitabilityReason;
        imgElement.classList.add(
          suitabilityReason === "Suitable for training"
            ? "suitable"
            : "unsuitable"
        );

        comparedImages.push(imgElement);
        spinner.style.display = "block";
        if (index === files.length - 1) {
          spinner.classList.add("hidden");
          statusText.textContent = "Comparison completed";
          createZipFile();
        }
        spinner.style.display = "none";
        comparisonAgain.style.display = "";
      };
    };
    reader.readAsDataURL(file);
  });
};

const getImageSuitabilityReason = async (imageElement) => {
  if (!shouldContinueComparison) {
    console.log("Comparison stopped getImageSuitabilityReason");
    return;
  }

  const img = new Image();
  img.src = imageElement.src;

  if (img.width !== 512 || img.height !== 512) {
    return "Not 512x512px";
  }

  const threshold = 50;
  for (let i = 0; i < comparedImages.length; i++) {
    const comparedElement = comparedImages[i];
    const diffData = await new Promise((resolve) => {
      resemble(imageElement.src)
        .compareTo(comparedElement.src)
        .ignoreColors()
        .onComplete((data) => {
          resolve(data);
        });
    });
    if (shouldContinueComparison && diffData.misMatchPercentage < threshold) {
      return `Similar to ${comparedElement.id}`;
    }
  }
  return "Suitable for training";
};

const createZipFile = () => {
  const suitableImages = comparedImages.filter(
    (imageElement) => !imageElement.classList.contains("unsuitable")
  );
  if (suitableImages.length === 0) {
    statusText.textContent = "No suitable images found";
    return;
  }
  const promises = suitableImages.map((imageElement) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      const context = canvas.getContext("2d");
      context.drawImage(imageElement, 0, 0);
      canvas.toBlob((blob) => {
        zip.file(generateRandomFileName(), blob);
        resolve();
      });
    });
  });

  Promise.all(promises).then(() => {
    zip.generateAsync({ type: "blob" }).then(function (content) {
      downloadLink.href = URL.createObjectURL(content);
      downloadLink.download = "image_comparison.zip";
      downloadLink.style.display = "block";
      comparisonAgain.style.display = "block";
      statusText.textContent = "Zip file ready for download";
    });
  });
};

const generateRandomFileName = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const length = 10;
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result + ".png";
};

const startComparisonAgain = () => {
  comparedImages = [];
  compareImages();
};

imageInput.addEventListener("change", compareImages);
thresholdInput.addEventListener("change", startComparisonAgain);
downloadLink.addEventListener("click", startComparisonAgain);
stopButton.addEventListener("click", () => {
  shouldContinueComparison = false;
});
