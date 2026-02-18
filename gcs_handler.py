import os
from google.cloud import storage
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# 기본 경로 설정
DEFAULT_DOWNLOAD_PATH = os.path.join("tmp", "download")
DEFAULT_UPLOAD_ITEMS = [
    ".env",
    "config.ts",
    "dump/",
    "gcp-key.json",
    "services/",
    "unencrypted-dumps/"
]

def get_gcs_client():
    """GCS 클라이언트를 생성합니다."""
    # GOOGLE_APPLICATION_CREDENTIALS 환경 변수가 설정되어 있어야 합니다.
    return storage.Client()

def upload_to_bucket(blob_name, path_to_file, bucket_name=None):
    """파일 하나를 GCS 버킷에 업로드합니다."""
    if bucket_name is None:
        bucket_name = os.getenv('GCS_BUCKET_NAME')
    
    if not bucket_name:
        print("Error: GCS_BUCKET_NAME not found in .env")
        return False

    try:
        storage_client = get_gcs_client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.upload_from_filename(path_to_file)
        print(f"Uploaded: {path_to_file} -> {blob_name}")
        return True
    except Exception as e:
        print(f"Error uploading {path_to_file}: {e}")
        return False

def upload_all_to_bucket(items=None, bucket_name=None):
    """지정된 파일 및 폴더들을 GCS 버킷에 모두 업로드합니다."""
    if items is None:
        items = DEFAULT_UPLOAD_ITEMS
    
    if bucket_name is None:
        bucket_name = os.getenv('GCS_BUCKET_NAME')

    if not bucket_name:
        print("Error: GCS_BUCKET_NAME not found in .env")
        return False

    success_count = 0
    fail_count = 0

    for item in items:
        # 경로 끝의 / 제거 (폴더 판별용으로만 사용)
        clean_path = item.rstrip('/')
        
        if not os.path.exists(clean_path):
            print(f"Skip: {clean_path} (File/Folder not found)")
            continue

        if os.path.isfile(clean_path):
            if upload_to_bucket(clean_path, clean_path, bucket_name):
                success_count += 1
            else:
                fail_count += 1
        elif os.path.isdir(clean_path):
            for root, dirs, files in os.walk(clean_path):
                for file in files:
                    local_full_path = os.path.join(root, file)
                    # GCS에서는 윈도우 경로 구분자(\) 대신 /를 사용해야 함
                    blob_name = local_full_path.replace("\\", "/")
                    if upload_to_bucket(blob_name, local_full_path, bucket_name):
                        success_count += 1
                    else:
                        fail_count += 1

    print(f"\nUpload Finished! Success: {success_count}, Fail: {fail_count}")
    return fail_count == 0

def download_from_bucket(blob_name, path_to_file, bucket_name=None):
    """GCS 버킷에서 파일 하나를 다운로드합니다."""
    if bucket_name is None:
        bucket_name = os.getenv('GCS_BUCKET_NAME')
    
    if not bucket_name:
        print("Error: GCS_BUCKET_NAME not found in .env")
        return False

    try:
        os.makedirs(os.path.dirname(os.path.abspath(path_to_file)), exist_ok=True)
        storage_client = get_gcs_client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.download_to_filename(path_to_file)
        print(f"Downloaded: {blob_name} -> {path_to_file}")
        return True
    except Exception as e:
        print(f"Error downloading {blob_name}: {e}")
        return False

def download_all_from_bucket(destination_dir, bucket_name=None):
    """GCS 버킷의 모든 파일을 다운로드합니다."""
    if bucket_name is None:
        bucket_name = os.getenv('GCS_BUCKET_NAME')
    
    if not bucket_name:
        print("Error: GCS_BUCKET_NAME not found in .env")
        return False

    try:
        storage_client = get_gcs_client()
        bucket = storage_client.bucket(bucket_name)
        blobs = bucket.list_blobs()
        
        count = 0
        for blob in blobs:
            if blob.name.endswith('/'):
                continue
                
            local_path = os.path.join(destination_dir, blob.name)
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            blob.download_to_filename(local_path)
            print(f"Downloaded: {blob.name} -> {local_path}")
            count += 1
            
        print(f"\nSuccessfully downloaded {count} files to {destination_dir}")
        return True
    except Exception as e:
        print(f"Error downloading all files: {e}")
        return False

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Upload Item:  python gcs_handler.py upload <local_path> <remote_blob_name>")
        print("  Upload All:   python gcs_handler.py upload-all")
        print("  Download Item:python gcs_handler.py download <remote_blob_name> [local_path]")
        print("  Download All: python gcs_handler.py download-all [destination_dir]")
        sys.exit(1)
    
    action = sys.argv[1].lower()
    
    if action == "upload":
        if len(sys.argv) < 4:
            print("Usage: python gcs_handler.py upload <local_path> <remote_blob_name>")
            sys.exit(1)
        upload_to_bucket(sys.argv[3], sys.argv[2])
    elif action == "upload-all":
        upload_all_to_bucket()
    elif action == "download":
        if len(sys.argv) < 3:
            print("Usage: python gcs_handler.py download <remote_blob_name> [local_path]")
            sys.exit(1)
        blob_name = sys.argv[2]
        local_path = sys.argv[3] if len(sys.argv) > 3 else os.path.join(DEFAULT_DOWNLOAD_PATH, os.path.basename(blob_name))
        download_from_bucket(blob_name, local_path)
    elif action == "download-all":
        destination = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_DOWNLOAD_PATH
        download_all_from_bucket(destination)
    else:
        print(f"Unknown action: {action}")
        print("Available: upload, upload-all, download, download-all")
