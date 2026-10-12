export function GuidePage() {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <header className="border-b border-line bg-panel px-4 py-3">
        <h1 className="text-sm font-medium">Technician guide</h1>
        <p className="text-xs text-muted">Research prototype. Not clinically validated.</p>
      </header>
      <article className="mx-auto max-w-2xl space-y-8 px-4 py-6 text-sm leading-relaxed">
        <p>
          CellScope helps a person review nuclei in a single 2D fluorescence image. It is a laboratory prototype. It does not make a diagnosis, and it has not been clinically validated.
        </p>
        <section>
          <h2 className="text-base font-medium">Choose a compatible image</h2>
          <p className="mt-2 text-muted">
            Use a 2D fluorescence image of a nuclear marker, such as a DAPI channel. PNG and JPEG only, up to 20 MB, with each side between 64 and 4096 pixels. TIFF is not accepted.
          </p>
          <p className="mt-2 text-muted">
            The model is StarDist 2D_versatile_fluo. It was trained for this fluorescence task. Do not use it on H&amp;E histology or brightfield, and do not treat those modalities as interchangeable. If the field looks bright and colored, the compatibility check warns you. You can continue only after confirming that the image really is a nuclear fluorescence micrograph.
          </p>
        </section>
        <section>
          <h2 className="text-base font-medium">Load and analyse</h2>
          <p className="mt-2 text-muted">
            Drop a file, browse, or open the sample image. Check the dimensions and the appearance note, then run analysis. The upload shows progress. After the upload, inference runs on the server and does not report a percentage. If it fails, the image stays loaded and Retry sends it again.
          </p>
          <p className="mt-2 text-muted">
            The sample image also has fixed annotations. Those are the shapes used to draw the demonstration field. They are labelled as sample annotations and are not a model prediction. Use them when you want to practise review without inference.
          </p>
        </section>
        <section>
          <h2 className="text-base font-medium">Read the overlays</h2>
          <p className="mt-2 text-muted">
            Teal marks are model detections, or sample annotations on the demonstration image. Amber crosses are cells you added. The white mark is the selection. Centres, boxes, and boundaries are shown only when the result actually contains that geometry. Boundaries stay aligned when you zoom because they are drawn in the image’s own pixel coordinates.
          </p>
          <p className="mt-2 text-muted">
            Object probability is StarDist’s score for the detection. It is not a calibrated probability of a biological class, and the slider appears only when those scores exist. Raising it hides lower-scoring model detections from the view and from export. It cannot recover detections the model already discarded.
          </p>
        </section>
        <section>
          <h2 className="text-base font-medium">Review misses and false detections</h2>
          <p className="mt-2 text-muted">
            Pan does not edit. Switch to Add, then click the centre of a missed nucleus. Switch to Select and click a detection before removing it. Undo and redo cover additions, removals, and the reviewed mark. Reset edits asks for confirmation and returns to the original result.
          </p>
          <p className="mt-2 text-muted">
            Mark the analysis reviewed when you have finished. Further edits return it to unreviewed. The current count is the original detections, minus removals and detections under the score cutoff, plus manual additions.
          </p>
        </section>
        <section>
          <h2 className="text-base font-medium">Crowded, soft, or incompatible images</h2>
          <p className="mt-2 text-muted">
            Star-convex shapes can separate some touching nuclei and will miss or merge others. Zoom in and select each centre. Do not assume every overlap was resolved.
          </p>
          <p className="mt-2 text-muted">
            Poor focus makes nuclei broad and dim. The model may drop them or draw an oversized contour. Incompatible staining, brightfield, or histology can produce convincing-looking marks that are not nuclei. Treat a warning, or an image outside the fluorescence domain, as a reason to stop rather than to interpret the count.
          </p>
        </section>
        <section>
          <h2 className="text-base font-medium">Export</h2>
          <p className="mt-2 text-muted">
            Export downloads an annotated PNG, a CSV, and a JSON file. All three use the detections still in the review: not removed, and, when scores exist, at or above the probability cutoff. The dialog shows the original count and the final reviewed count. Manual additions are marked as manual. There is no spatial calibration, so coordinates stay in pixels.
          </p>
        </section>
      </article>
    </div>
  )
}
