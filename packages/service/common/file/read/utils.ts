import { uploadMongoImg } from '../image/controller';
import FormData from 'form-data';
import { WorkerNameEnum, runWorker } from '../../../worker/utils';
import fs from 'fs';
import type { ReadFileResponse } from '../../../worker/readFile/type';
import axios from 'axios';
import { addLog } from '../../system/log';
import { batchRun } from '@fastgpt/global/common/system/utils';
import { matchMdImg } from '@fastgpt/global/common/string/markdown';
import { createPdfParseUsage } from '../../../support/wallet/usage/controller';
import { useDoc2xServer } from '../../../thirdProvider/doc2x';

export type readRawTextByLocalFileParams = {
  teamId: string;
  tmbId: string;
  path: string;
  encoding: string;
  customPdfParse?: boolean;
  getFormatText?: boolean;
  metadata?: Record<string, any>;
};
export const readRawTextByLocalFile = async (params: readRawTextByLocalFileParams) => {
  const { path } = params;

  const extension = path?.split('.')?.pop()?.toLowerCase() || '';

  const buffer = await fs.promises.readFile(path);

  return readRawContentByFileBuffer({
    extension,
    customPdfParse: params.customPdfParse,
    getFormatText: params.getFormatText,
    teamId: params.teamId,
    tmbId: params.tmbId,
    encoding: params.encoding,
    buffer,
    metadata: params.metadata
  });
};

export const readRawContentByFileBuffer = async ({
  teamId,
  tmbId,

  extension,
  buffer,
  encoding,
  metadata,
  customPdfParse = false,
  getFormatText = true
}: {
  teamId: string;
  tmbId: string;

  extension: string;
  buffer: Buffer;
  encoding: string;
  metadata?: Record<string, any>;

  customPdfParse?: boolean;
  getFormatText?: boolean;
}): Promise<{
  rawText: string;
}> => {
  const systemParse = () =>
    runWorker<ReadFileResponse>(WorkerNameEnum.readFile, {
      extension,
      encoding,
      buffer,
      teamId
    });
  const parsePdfFromCustomService = async (): Promise<ReadFileResponse> => {
    const url = global.systemEnv.customPdfParse?.url;
    const token = global.systemEnv.customPdfParse?.key;
    if (!url) return systemParse();

    const start = Date.now();
    addLog.info('Parsing files from an external service');

    const data = new FormData();
    data.append('file', buffer, {
      filename: `file.${extension}`
    });
    const { data: response } = await axios.post<{
      pages?: number;
      page?: number; // marker v0.1 compatibility
      markdown?: string;
      error?: Object | string;
      success?: boolean;
      message?: string;
      data?: {
        pages?: number;
        page?: number; // marker v0.2 uses "page" not "pages"
        markdown?: string;
      };
    }>(url, data, {
      timeout: 900000,
      headers: {
        ...data.getHeaders(),
        Authorization: token ? `Bearer ${token}` : undefined
      }
    });

    if (response.error) {
      return Promise.reject(response.error);
    }

    addLog.info(`Custom file parsing is complete, time: ${Date.now() - start}ms`);

    // Compatible with multiple formats:
    // - marker v0.1: { pages, markdown }
    // - marker v0.2: { success, data: { page, markdown } }
    const actualData = response.data || response;
    const rawText = actualData.markdown || '';
    const pages = actualData.pages || actualData.page || 0;

    if (!rawText) {
      addLog.warn('Marker returned empty markdown content', {
        responseKeys: Object.keys(response),
        dataKeys: response.data ? Object.keys(response.data) : [],
        success: response.success
      });
      return Promise.reject('PDF parsing returned empty content');
    }

    addLog.info(`Marker parsed PDF successfully: ${pages} pages, ${rawText.length} chars`);

    const { text, imageList } = matchMdImg(rawText);

    createPdfParseUsage({
      teamId,
      tmbId,
      pages
    });

    return {
      rawText: text,
      formatText: rawText,
      imageList
    };
  };
  // Doc2x api
  const parsePdfFromDoc2x = async (): Promise<ReadFileResponse> => {
    const doc2xKey = global.systemEnv.customPdfParse?.doc2xKey;
    if (!doc2xKey) return systemParse();

    const { pages, text, imageList } = await useDoc2xServer({ apiKey: doc2xKey }).parsePDF(buffer);

    createPdfParseUsage({
      teamId,
      tmbId,
      pages
    });

    return {
      rawText: text,
      formatText: text,
      imageList
    };
  };
  // Custom read file service
  const pdfParseFn = async (): Promise<ReadFileResponse> => {
    if (!customPdfParse) return systemParse();
    if (global.systemEnv.customPdfParse?.url) return parsePdfFromCustomService();
    if (global.systemEnv.customPdfParse?.doc2xKey) return parsePdfFromDoc2x();

    return systemParse();
  };

  const start = Date.now();
  addLog.debug(`Start parse file`, { extension });

  let { rawText, formatText, imageList } = await (async () => {
    if (extension === 'pdf') {
      return await pdfParseFn();
    }
    return await systemParse();
  })();

  addLog.debug(`Parse file success, time: ${Date.now() - start}ms. `);

  // markdown data format
  if (imageList) {
    await batchRun(imageList, async (item) => {
      const src = await (async () => {
        try {
          return await uploadMongoImg({
            base64Img: `data:${item.mime};base64,${item.base64}`,
            teamId,
            metadata: {
              ...metadata,
              mime: item.mime
            }
          });
        } catch (error) {
          addLog.warn('Upload file image error', { error });
          return 'Upload load image error';
        }
      })();
      rawText = rawText.replace(item.uuid, src);
      if (formatText) {
        formatText = formatText.replace(item.uuid, src);
      }
    });
  }

  addLog.debug(`Upload file success, time: ${Date.now() - start}ms`);

  return { rawText: getFormatText ? formatText || rawText : rawText };
};
