export class VisboFile {
  name: string;
  updatedAt: Date;
  size: number
}

export class VisboFilesResponse {
  state: string;
  message: string;
  files: [ VisboFile ]
}

export class VisboDownloadResponse {
  state: string;
  message: string;
  text: string
}
