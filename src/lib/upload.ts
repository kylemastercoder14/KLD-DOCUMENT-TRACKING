import AWS from "aws-sdk";

export async function upload(
  file: File,
  progressCallback?: (progress: number) => void
) {
  try {
    AWS.config.update({
      accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY,
    });

    const s3 = new AWS.S3({
      params: {
        Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
      },
      region: process.env.NEXT_PUBLIC_S3_REGION,
    });

    const file_key = `uploads/${Date.now().toString()}_${file.name.replace(
      / /g,
      "-"
    )}`;

    const params = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: file_key,
      Body: file,
    };

    const upload = s3
      .putObject(params)
      .on("httpUploadProgress", (evt) => {
        const progress = Math.round((evt.loaded / evt.total) * 100);
        if (progressCallback) {
          progressCallback(progress); // Call the progress callback if provided
        }
      })
      .promise();

    await upload;

    console.log("Successfully uploaded to S3:", file_key);

    const url = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_S3_REGION}.amazonaws.com/${file_key}`;
    return { url };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}

export async function uploadFile(
  file: File,
  progressCallback?: (progress: number) => void
) {
  try {
    AWS.config.update({
      accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY,
    });

    const s3 = new AWS.S3({
      params: {
        Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
      },
      region: process.env.NEXT_PUBLIC_S3_REGION,
    });

    const file_key = `ecr/${Date.now().toString()}_${file.name.replace(
      / /g,
      "-"
    )}`;

    const params = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: file_key,
      Body: file,
    };

    const upload = s3
      .putObject(params)
      .on("httpUploadProgress", (evt) => {
        const progress = Math.round((evt.loaded / evt.total) * 100);
        if (progressCallback) {
          progressCallback(progress); // Call the progress callback if provided
        }
      })
      .promise();

    await upload;

    console.log("Successfully uploaded to S3:", file_key);

    const url = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_S3_REGION}.amazonaws.com/${file_key}`;
    return { url };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}

/**
 * Delete a file from AWS S3.
 * @param {string} fileKey - The key of the file to delete in S3.
 * @returns {Promise<{ success: boolean; message: string }>} - Response indicating success or failure.
 */

export async function deleteImage(
  fileKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Configure AWS SDK
    AWS.config.update({
      accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY,
    });

    const s3 = new AWS.S3({
      region: process.env.NEXT_PUBLIC_S3_REGION,
    });

    const params = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: `/uploads/${fileKey}`,
    };

    await s3.deleteObject(params).promise();

    console.log(`Successfully deleted file: ${fileKey}`);
    return { success: true, message: `File ${fileKey} deleted successfully.` };
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    return { success: false, message: "Error deleting file from S3." };
  }
}

export async function deleteFromS3(fullUrl: string) {
  try {
    AWS.config.update({
      accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY,
    });

    const s3 = new AWS.S3({
      params: {
        Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
      },
      region: process.env.NEXT_PUBLIC_S3_REGION,
    });

    // Extract the key from the full URL
    const bucketUrl = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_S3_REGION}.amazonaws.com/`;
    if (!fullUrl.startsWith(bucketUrl)) {
      throw new Error("Invalid S3 URL. URL does not match bucket.");
    }

    const key = fullUrl.replace(bucketUrl, "");
    console.log("Key:", key);
    if (!key) {
      return { error: "Invalid S3 URL. Key could not be extracted." };
    }

    const params = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    return { success: "Successfully removed video from s3." };
  } catch (error) {
    console.error("Error deleting from S3:", error);
    return { error: "Failed to delete video from s3." };
  }
}
