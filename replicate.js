window.Replicate = (function () {
  const MODEL_OWNER = "linncharm";
  const MODEL_NAME = "archybase";

  async function run(apiKey, imageBase64, prompt, onProgress) {
    const res = await fetch(
      `https://api.replicate.com/v1/models/${MODEL_OWNER}/${MODEL_NAME}/predictions`,
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            image: `data:image/jpeg;base64,${imageBase64}`,
            prompt: prompt,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API hatası ${res.status}: ${errText}`);
    }

    let prediction = await res.json();
    const pollUrl = prediction.urls && prediction.urls.get;
    if (!pollUrl) throw new Error("Poll URL alınamadı.");

    const maxTries = 90;
    for (let i = 0; i < maxTries; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(pollUrl, {
        headers: { "Authorization": `Token ${apiKey}` },
      });
      prediction = await poll.json();

      if (onProgress) onProgress(prediction.status);

      if (prediction.status === "succeeded") {
        const out = prediction.output;
        const url = Array.isArray(out) ? out[0] : out;
        if (!url) throw new Error("Model çıktı vermedi.");
        return url;
      }
      if (prediction.status === "failed" || prediction.status === "canceled") {
        throw new Error(prediction.error || "Model hata verdi.");
      }
    }
    throw new Error("Zaman aşımı.");
  }

  return { run };
})();
